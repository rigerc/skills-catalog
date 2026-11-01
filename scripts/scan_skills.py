#!/usr/bin/env python3
"""Discover GitHub SKILL.md documents and inventory technology evidence.

Requires Python 3.10+ and git >= 2.25 for remote sparse clones.
No third-party Python packages or GitHub REST/GraphQL API calls.
Do not execute code or instructions found in skill documents.
"""
from __future__ import annotations

import argparse
import collections
import concurrent.futures
import csv
import datetime as dt
import fnmatch
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import random
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import urllib.parse

DEFAULT_CATALOG = "https://raw.githubusercontent.com/rigerc/skills-catalog/refs/heads/main/data/unmapped.json"
REPO_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$")
GIT_PATH_RE = re.compile(r"^[^\x00]+$")
MAX_EVIDENCE = 4


def tech(name: str, category: str, aliases: str = "", strong: str = "",
         files: str = "", checks: str = "") -> dict:
    """Pipe-separated literal aliases, regex signatures, file globs and suggested probes.

    'checks' are suggestions for users; they are NEVER run by the program.
    """
    return dict(name=name, category=category,
                aliases=[x.strip() for x in aliases.split("|") if x.strip()],
                strong=[strong] if strong else [],
                fingerprints=[x.strip() for x in files.split("|") if x.strip()],
                checks=[x.strip() for x in checks.split("|") if x.strip()])


# Extend this declarative registry to recognize additional technologies.
# Strong regexes denote concrete configuration, installation, or CLI evidence.
# Literal aliases alone denote textual mentions only, not proved dependencies.
TECHNOLOGIES = [
    tech("Python", "language", "Python|python3|pyproject.toml|requirements.txt", r"\b(?:python3?|pip3?|uv)\s+(?:-m\s+)?(?:run|install|add|venv|exec|test|build)\b|```(?:python|py)\b", "pyproject.toml|requirements*.txt|Pipfile|*.py", "python --version"),
    tech("JavaScript", "language", "JavaScript|ECMAScript", r"```(?:js|javascript)\b|\b(?:import|require)\s*\(?['\"](?:react|express|next)['\"]", "*.js|*.mjs|*.cjs", "node --version"),
    tech("TypeScript", "language", "TypeScript|tsconfig.json", r"```(?:ts|typescript|tsx)\b|\btsc\s+(?:--noEmit|--build)\b", "tsconfig.json|*.ts|*.tsx", "npx tsc --version"),
    tech("Node.js", "runtime", "Node.js|nodejs|package.json", r"\bnode\s+[\w./-]+\.(?:js|mjs|cjs)\b|\b(?:npm|npx|pnpm)\s+(?:install|run|exec|create|dlx)\b", "package.json|package-lock.json|.nvmrc", "node --version"),
    tech("Go", "language", "Golang|go.mod|go.sum", r"\bgo\s+(?:run|test|mod|build|get|install|generate)\b|```go\b", "go.mod|go.sum|*.go", "go version"),
    tech("Rust", "language", "Rust|Cargo.toml|cargo", r"\bcargo\s+(?:build|test|run|add|install|check)\b|```rust\b", "Cargo.toml|Cargo.lock|*.rs", "rustc --version"),
    tech("Java", "language", "Java|Maven|Gradle", r"```java\b|\b(?:mvn|gradle)\s+(?:build|test|package|install)\b", "pom.xml|build.gradle|build.gradle.kts|*.java", "java -version"),
    tech("Kotlin", "language", "Kotlin|kotlinc", r"```kotlin\b", "*.kt|*.kts", "kotlinc -version"),
    tech("Swift", "language", "Swift|SwiftUI", r"```swift\b|\bswift\s+(?:build|test|run|package)\b", "Package.swift|*.swift", "swift --version"),
    tech("PHP", "language", "PHP|composer.json", r"```php\b|\bcomposer\s+(?:install|require|update)\b", "composer.json|composer.lock|*.php", "php --version"),
    tech("Ruby", "language", "Ruby|Gemfile|Bundler", r"```ruby\b|\bbundle\s+(?:install|exec|update)\b", "Gemfile|Gemfile.lock|*.rb", "ruby --version"),
    tech("C#", "language", "C#|CSharp|.NET", r"```(?:csharp|cs)\b|\bdotnet\s+(?:build|run|test|restore)\b", "*.csproj|*.cs|*.sln", "dotnet --info"),
    tech("C++", "language", "C++|CMake", r"```(?:cpp|c\+\+)\b|\bcmake\s+(?:-S|--build)\b", "CMakeLists.txt|*.cpp|*.hpp", "cmake --version"),
    tech("Bash", "language", "Bash|shell script", r"```(?:bash|sh|shell)\b|^#!/(?:usr/bin/env\s+)?bash\b", "*.sh|.bashrc", "bash --version"),
    tech("SQL", "language", "SQL|SQLAlchemy", r"```sql\b|\bSELECT\s+.{1,160}\bFROM\s+\w+", "*.sql", "inspect .sql migrations or database connection strings"),
    tech("React", "framework", "React|React.js|ReactJS", r"\b(?:from\s+['\"]react['\"]|react-dom|createRoot\s*\()", "*.jsx|*.tsx", "inspect package.json dependencies for react"),
    tech("Next.js", "framework", "Next.js|nextjs", r"\bnext\s+(?:dev|build|start)\b|['\"]next['\"]\s*:", "next.config.*", "inspect package.json dependencies for next"),
    tech("Vue", "framework", "Vue.js|Vue 3|VueJS", r"\b(?:from\s+['\"]vue['\"]|createApp\s*\()", "vue.config.*|*.vue", "inspect package.json dependencies for vue"),
    tech("Nuxt", "framework", "Nuxt|Nuxt.js", r"\bnuxt\s+(?:dev|build|generate)\b", "nuxt.config.*", "inspect package.json dependencies for nuxt"),
    tech("Angular", "framework", "Angular|AngularJS", r"\bng\s+(?:build|serve|test|generate)\b", "angular.json", "inspect package.json dependencies for @angular/core"),
    tech("Svelte", "framework", "Svelte|SvelteKit", r"\b@sveltejs/(?:kit|vite-plugin-svelte)\b", "svelte.config.*|*.svelte", "inspect package.json dependencies for svelte"),
    tech("Astro", "framework", "Astro framework|Astro.build", r"\bastro\s+(?:dev|build|preview)\b", "astro.config.*", "inspect package.json dependencies for astro"),
    tech("Express", "framework", "Express.js|ExpressJS", r"\b(?:require\(['\"]express['\"]\)|from\s+['\"]express['\"])", "", "inspect package.json dependencies for express"),
    tech("FastAPI", "framework", "FastAPI", r"\b(?:from\s+fastapi\s+import|uvicorn\s+\S+:app)\b", "", "inspect pyproject.toml and Python imports for fastapi"),
    tech("Django", "framework", "Django", r"\bmanage\.py\s+(?:runserver|migrate|test)\b|\bDJANGO_SETTINGS_MODULE\b", "manage.py|settings.py", "inspect pyproject.toml and Python imports for django"),
    tech("Flask", "framework", "Flask (Python)|Flask framework", r"\b(?:from\s+flask\s+import|flask\s+(?:run|--app))\b", "", "inspect Python imports for flask"),
    tech("Spring Boot", "framework", "Spring Boot|spring-boot", r"\b@SpringBootApplication\b", "application.properties|application.yml", "inspect Maven/Gradle dependencies for spring-boot"),
    tech("Tailwind CSS", "framework", "Tailwind CSS|tailwindcss", r"\b(?:@tailwind\s+(?:base|components|utilities)|tailwindcss\s+init)\b", "tailwind.config.*", "inspect package.json dependencies for tailwindcss"),
    tech("Vite", "build-tool", "Vite|vite.config", r"\bvite\s+(?:build|dev|preview)\b", "vite.config.*", "inspect package.json dependencies for vite"),
    tech("Webpack", "build-tool", "Webpack|webpack.config", r"\bwebpack\s+(?:--mode|--config)\b", "webpack.config.*", "inspect package.json dependencies for webpack"),
    tech("npm", "package-manager", "npm|package-lock.json", r"\bnpm\s+(?:install|ci|run|init|publish|exec)\b", "package-lock.json", "npm --version"),
    tech("pnpm", "package-manager", "pnpm|pnpm-lock.yaml", r"\bpnpm\s+(?:install|add|run|dlx|exec)\b", "pnpm-lock.yaml", "pnpm --version"),
    tech("Yarn", "package-manager", "yarn.lock|Yarn Berry", r"\byarn\s+(?:install|add|run|dlx|workspaces)\b", "yarn.lock|.yarnrc.yml", "yarn --version"),
    tech("uv", "package-manager", "uv.lock|astral-sh/uv", r"\buv\s+(?:sync|run|add|pip|venv|tool)\b", "uv.lock", "uv --version"),
    tech("Poetry", "package-manager", "Poetry (Python)|poetry.lock", r"\bpoetry\s+(?:install|add|run|build|lock)\b", "poetry.lock", "poetry --version"),
    tech("Docker", "container", "Docker|Dockerfile|docker-compose", r"\bdocker\s+(?:build|run|compose|pull|exec)\b|\bFROM\s+(?:python|node|ubuntu|alpine):", "Dockerfile|Dockerfile.*|docker-compose*.yml|docker-compose*.yaml|compose.yaml|compose.yml", "docker --version"),
    tech("Kubernetes", "orchestration", "Kubernetes|K8s|kubectl", r"\bkubectl\s+(?:apply|get|describe|delete|rollout)\b|\bapiVersion:\s*(?:apps/|v1)", "Chart.yaml|kustomization.yaml", "kubectl version --client"),
    tech("Helm", "orchestration", "Helm chart|helmfile", r"\bhelm\s+(?:install|upgrade|template|lint|repo)\b", "Chart.yaml|values.yaml", "helm version"),
    tech("Terraform", "infrastructure", "Terraform|OpenTofu|tofu init", r"\b(?:terraform|tofu)\s+(?:init|plan|apply|destroy|validate)\b", "*.tf|*.tfvars|.terraform.lock.hcl", "terraform version"),
    tech("Ansible", "infrastructure", "Ansible|ansible-playbook", r"\bansible-playbook\s+\S+", "ansible.cfg|playbook.yml|playbook.yaml", "ansible --version"),
    tech("GitHub Actions", "ci", "GitHub Actions|github/workflows", r"\buses:\s*[\w.-]+/[\w.-]+@v?\d+", ".github/workflows/*.yml|.github/workflows/*.yaml", "inspect GitHub Actions workflow files"),
    tech("GitLab CI", "ci", "GitLab CI|GitLab CI/CD", r"\bgitlab-runner\s+(?:exec|register|verify)\b", ".gitlab-ci.yml", "inspect .gitlab-ci.yml"),
    tech("Jenkins", "ci", "Jenkins|Jenkinsfile", r"\bpipeline\s*\{\s*$", "Jenkinsfile", "inspect Jenkinsfile"),
    tech("Nginx", "web-server", "Nginx|nginx.conf", r"\bnginx\s+(?:-t|-s|reload)\b", "nginx.conf", "nginx -v"),
    tech("PostgreSQL", "database", "PostgreSQL|Postgres|psql", r"\b(?:psql\s+(?:-h|-U|-d)|postgres(?:ql)?://)\b", "", "inspect connection URLs, migrations, and dependency manifests"),
    tech("MySQL", "database", "MySQL|MariaDB", r"\bmysql\s+(?:-h|-u|-p)\b|\bmysql://", "", "inspect connection URLs and dependency manifests"),
    tech("SQLite", "database", "SQLite|sqlite3", r"\bsqlite3\s+\S+\.(?:db|sqlite)\b|\bsqlite:///", "*.sqlite|*.sqlite3", "inspect SQLite database paths or imports"),
    tech("MongoDB", "database", "MongoDB|pymongo|mongoose", r"\bmongodb(?:\+srv)?://", "", "inspect URI schemes and dependency manifests"),
    tech("Redis", "database", "Redis|redis-cli", r"\bredis-cli\s+(?:ping|set|get)\b|\bredis://", "redis.conf", "inspect connection URLs and dependency manifests"),
    tech("Elasticsearch", "search", "Elasticsearch|ElasticSearch|elasticsearch-py", r"\b(?:@elastic/elasticsearch|elasticsearch\.Elasticsearch)\b", "", "inspect Python/JS dependency manifests"),
    tech("OpenSearch", "search", "OpenSearch|opensearch-py", r"\bopensearch(?:-py|-js)?\b", "", "inspect dependency manifests and endpoint URLs"),
    tech("DuckDB", "database", "DuckDB|duckdb", r"\b(?:import\s+duckdb|duckdb\.connect)\b", "*.duckdb", "inspect package manifests and database filenames"),
    tech("ClickHouse", "database", "ClickHouse|clickhouse-client", r"\bclickhouse-client\b", "", "inspect client dependencies and connection URLs"),
    tech("BigQuery", "data-platform", "BigQuery|google-cloud-bigquery", r"\bfrom\s+google\.cloud\s+import\s+bigquery\b", "", "inspect dependencies for google-cloud-bigquery"),
    tech("Snowflake", "data-platform", "Snowflake SQL|Snowflake database|snowflake-connector", r"\bsnowflake\.connector\.connect\b", "", "inspect dependency manifests for snowflake connectors"),
    tech("Apache Spark", "data-platform", "Apache Spark|PySpark|spark-submit", r"\bspark-submit\s+\S+|\bfrom\s+pyspark\b", "", "inspect PySpark dependencies and spark-submit invocations"),
    tech("AWS", "cloud", "Amazon Web Services|AWS CLI|AWS SDK|boto3", r"\baws\s+(?:s3|ec2|lambda|cloudformation|sts|secretsmanager)\b|\bimport\s+boto3\b", "serverless.yml|template.yaml", "aws --version; check IAM/config environment"),
    tech("Google Cloud", "cloud", "Google Cloud|GCP|gcloud|Vertex AI", r"\bgcloud\s+(?:auth|run|projects|functions|compute)\b", "app.yaml|cloudbuild.yaml", "gcloud --version"),
    tech("Azure", "cloud", "Microsoft Azure|Azure CLI|Azure Functions", r"\baz\s+(?:login|group|webapp|functionapp|storage)\b", "azure.yaml|host.json", "az version"),
    tech("Cloudflare", "cloud", "Cloudflare|Workers|Wrangler", r"\bwrangler\s+(?:deploy|dev|secret|pages)\b", "wrangler.toml|wrangler.jsonc", "npx wrangler --version"),
    tech("Vercel", "hosting", "Vercel", r"\bvercel\s+(?:deploy|dev|build|env)\b", "vercel.json", "inspect Vercel project config"),
    tech("Netlify", "hosting", "Netlify", r"\bnetlify\s+(?:deploy|dev|build)\b", "netlify.toml", "inspect netlify.toml"),
    tech("Firebase", "backend", "Firebase|Firestore|firebase-admin", r"\bfirebase\s+(?:deploy|emulators|login)\b", "firebase.json|.firebaserc", "inspect firebase.json and SDK dependencies"),
    tech("Supabase", "backend", "Supabase|supabase-js", r"\bsupabase\s+(?:start|db|gen|functions)\b", "supabase/config.toml", "inspect Supabase configuration and SDK dependencies"),
    tech("OpenAI API", "ai-service", "OpenAI API|openai-python|gpt-4o|gpt-5|gpt-6", r"\b(?:from\s+openai\s+import|OPENAI_API_KEY|api\.openai\.com|client\.responses\.create)\b", "", "inspect OpenAI SDK imports and OPENAI_API_KEY usage"),
    tech("Anthropic API", "ai-service", "Anthropic API|Claude API|ANTHROPIC_API_KEY", r"\b(?:from\s+anthropic\s+import|api\.anthropic\.com|anthropic\.Anthropic)\b", "", "inspect Anthropic SDK imports and ANTHROPIC_API_KEY usage"),
    tech("Hugging Face", "ai-platform", "Hugging Face|huggingface_hub|hf.co", r"\b(?:huggingface-cli|hf\s+(?:download|upload|auth)|from\s+transformers\s+import)\b", "", "inspect model IDs and huggingface_hub dependency"),
    tech("LangChain", "ai-framework", "LangChain|langchain-core|langchain_community", r"\bfrom\s+langchain[_\w.]*\s+import\b", "", "inspect langchain dependencies and imports"),
    tech("LlamaIndex", "ai-framework", "LlamaIndex|llama-index", r"\bfrom\s+llama_index[.\w]*\s+import\b", "", "inspect llama-index dependencies and imports"),
    tech("Ollama", "ai-runtime", "Ollama", r"\bollama\s+(?:serve|run|pull|list)\b|\blocalhost:11434\b", "", "ollama --version"),
    tech("PyTorch", "ai-framework", "PyTorch|torchvision", r"\bimport\s+torch\b|\bfrom\s+torch\b", "", "inspect Python dependencies for torch"),
    tech("TensorFlow", "ai-framework", "TensorFlow|Keras", r"\bimport\s+tensorflow\b|\bfrom\s+tensorflow\b", "", "inspect Python dependencies for tensorflow"),
    tech("scikit-learn", "ai-framework", "scikit-learn|sklearn", r"\bfrom\s+sklearn[.\w]*\s+import\b", "", "inspect Python dependencies for scikit-learn"),
    tech("Playwright", "browser-automation", "Playwright|playwright-cli", r"\b(?:from\s+playwright|npx\s+playwright|playwright\s+test)\b", "playwright.config.*", "npx playwright --version"),
    tech("Puppeteer", "browser-automation", "Puppeteer|puppeteer-core", r"\b(?:from\s+['\"]puppeteer|require\(['\"]puppeteer)\b", "", "inspect package.json dependencies for puppeteer"),
    tech("Selenium", "browser-automation", "Selenium|selenium-webdriver", r"\bfrom\s+selenium\b", "", "inspect Selenium imports/dependencies"),
    tech("Chrome DevTools MCP", "agent-tool", "chrome-devtools-mcp|Chrome DevTools MCP", r"\bchrome-devtools-mcp(?:@latest)?\b", ".mcp.json", "inspect MCP server configuration for chrome-devtools-mcp"),
    tech("MCP", "agent-protocol", "Model Context Protocol|MCP server|MCP tools|mcpServers", r"\b(?:mcpServers|\.mcp\.json|@modelcontextprotocol/|\bmcp\s+server\b)", ".mcp.json", "inspect MCP server config and package dependencies"),
    tech("Git", "version-control", "git clone|git commit|git status|Git repository", r"\bgit\s+(?:clone|commit|checkout|push|pull|diff|rebase)\b", ".gitmodules", "git --version"),
    tech("Figma", "design", "Figma|Figma API", r"\b(?:FIGMA_ACCESS_TOKEN|api\.figma\.com|figma\.com/file/)\b", "", "inspect Figma API tokens and endpoints"),
    tech("Shopify", "commerce", "Shopify|shopify-cli|Liquid templates", r"\bshopify\s+(?:app|theme|hydrogen)\b|\bSHOPIFY_API_KEY\b", "shopify.app.toml|*.liquid", "inspect Shopify app manifest and theme templates"),
    tech("Stripe", "payments", "Stripe API|Stripe Checkout|stripe-python|stripe-node", r"\b(?:STRIPE_SECRET_KEY|api\.stripe\.com|stripe\.checkout\.Session)\b", "", "inspect Stripe SDK dependency and environment key usage"),
    tech("Slack", "communications", "Slack API|Slack bot|Slack SDK|slack.com/api", r"\b(?:SLACK_BOT_TOKEN|SLACK_SIGNING_SECRET|slack_sdk|@slack/bolt)\b", "", "inspect Slack SDK imports and application config"),
    tech("Discord", "communications", "Discord API|discord.py|discord.js|Discord bot", r"\b(?:DISCORD_BOT_TOKEN|discord\.Client|discord\.js)\b", "", "inspect Discord SDK imports and bot config"),
    tech("Notion", "productivity", "Notion API|Notion database|notion-client", r"\b(?:NOTION_API_KEY|api\.notion\.com|@notionhq/client)\b", "", "inspect Notion SDK dependencies and API usage"),
    tech("Google Sheets", "productivity", "Google Sheets|Sheets API|gspread", r"\b(?:sheets\.googleapis\.com|from\s+googleapiclient|gspread\.authorize)\b", "", "inspect Sheets API client and OAuth scopes"),
    tech("Google Drive", "productivity", "Google Drive|Drive API", r"\b(?:drive\.googleapis\.com|www\.googleapis\.com/drive/)\b", "", "inspect Drive API client and OAuth scopes"),
    tech("Airtable", "productivity", "Airtable API|pyairtable", r"\b(?:api\.airtable\.com|AIRTABLE_API_KEY|pyairtable)\b", "", "inspect Airtable API client and key usage"),
    tech("Apify", "automation", "Apify|apify-client", r"\b(?:APIFY_TOKEN|api\.apify\.com|apify-client)\b", "", "inspect Apify client dependencies and API endpoints"),
    tech("n8n", "automation", "n8n|n8n.io", r"\b(?:N8N_API_KEY|n8n\s+(?:start|import:workflow))\b", "", "inspect n8n webhook and workflow configuration"),
    tech("Zapier", "automation", "Zapier|Zapier webhook", r"\bhooks\.zapier\.com\b", "", "inspect Zapier webhooks and app connections"),
    tech("WordPress", "cms", "WordPress|wp-cli|wp-admin", r"\bwp\s+(?:plugin|theme|core|post)\b", "wp-config.php", "inspect wp-config.php and plugin/theme files"),
    tech("Prometheus", "observability", "Prometheus|prom-client", r"\bprometheus(?:\.yml|_client|\.Counter)\b", "prometheus.yml", "inspect Prometheus config and metric client imports"),
    tech("Grafana", "observability", "Grafana|grafana.com", r"\bGF_SECURITY_ADMIN_PASSWORD\b", "", "inspect Grafana provisioning config"),
    tech("Sentry", "observability", "Sentry SDK|sentry.io|sentry-sdk", r"\b(?:SENTRY_DSN|sentry_sdk\.init|Sentry\.init)\b", "sentry.*.config.*", "inspect Sentry DSN and SDK initialization"),
]

# Compiled regexes; matching untrusted text does not entail executing it.
for _r in TECHNOLOGIES:
    _r["alias_re"] = [re.compile(r"(?<![A-Za-z0-9_])" + re.escape(a) + r"(?![A-Za-z0-9_])", re.I)
                      for a in _r["aliases"]]
    try:
        _r["strong_re"] = [re.compile(p, re.I | re.M) for p in _r["strong"]]
    except re.error as exc:
        raise ValueError(f"Invalid regex for {_r['name']}: {_r['strong']}: {exc}") from exc


def iso_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


class NetworkPacer:
    """Space out outbound Git operations across concurrent worker threads."""

    def __init__(self, seconds: float):
        self.seconds = seconds
        self.lock = threading.Lock()
        self.next_start = 0.0

    def wait(self) -> None:
        if not self.seconds:
            return
        with self.lock:
            now = time.monotonic()
            pause = max(0.0, self.next_start - now)
            self.next_start = max(now, self.next_start) + self.seconds
        if pause:
            time.sleep(pause)


def is_transient_error(exc: Exception) -> bool:
    """Retry throttling and temporary transport faults; not missing/forbidden repos."""
    if isinstance(exc, urllib.error.HTTPError):
        return exc.code in (408, 425, 429, 500, 502, 503, 504) or (
            exc.code == 403 and ("rate limit" in str(exc).lower() or
                                 "secondary limit" in str(exc).lower()))
    if isinstance(exc, (TimeoutError, subprocess.TimeoutExpired, urllib.error.URLError)):
        return True
    text = str(exc).lower()
    return any(word in text for word in (
        "429", "too many requests", "rate limit", "secondary limit", "abuse detection",
        "403 forbidden", "http 500", "http 502", "http 503", "http 504",
        "connection reset", "connection timed out", "timed out", "early eof",
        "remote end hung up", "tls connection", "could not resolve host",
        "failed to connect", "network is unreachable", "rpc failed",
    ))


def retry_network(operation, *, retries: int, base_delay: float, max_delay: float,
                  pacer: NetworkPacer | None = None, label: str = "request"):
    """Retry transient failures with capped exponential backoff and jitter."""
    for attempt in range(retries + 1):
        if pacer:
            pacer.wait()
        try:
            return operation()
        except Exception as exc:
            if attempt >= retries or not is_transient_error(exc):
                raise
            pause = min(max_delay, base_delay * (2 ** attempt))
            pause *= random.uniform(0.85, 1.15)
            print(f"{label}: transient failure ({str(exc)[:180]}); "
                  f"retry {attempt + 1}/{retries} after {pause:.1f}s", file=sys.stderr)
            time.sleep(pause)


def load_catalog(location: str, timeout: int, *, cache_dir: Path | None = None,
                 cache_ttl: int = 86400, refresh: bool = False,
                 retries: int = 5, backoff: float = 4.0, max_backoff: float = 90.0) -> dict:
    if location.startswith(("https://", "http://")):
        cache = None
        if cache_dir is not None:
            cache_dir.mkdir(parents=True, exist_ok=True)
            digest = hashlib.sha256(location.encode()).hexdigest()[:16]
            cache = cache_dir / f"catalog-{digest}.json"
            if (not refresh and cache.exists() and
                    time.time() - cache.stat().st_mtime < cache_ttl):
                print("Using cached catalog", file=sys.stderr)
                data = cache.read_bytes()
                obj = json.loads(data)
                if not isinstance(obj, dict) or not isinstance(obj.get("skills"), list):
                    raise ValueError("Invalid cached catalog JSON")
                return validate_catalog(obj)

        def fetch():
            request = urllib.request.Request(location, headers={"User-Agent": "skill-tech-inventory/2.0"})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                data = response.read(15_000_001)
            if len(data) > 15_000_000:
                raise ValueError("Catalog exceeds 15 MB safety limit")
            return data

        try:
            data = retry_network(fetch, retries=retries, base_delay=backoff,
                                 max_delay=max_backoff, label="catalog download")
        except (urllib.error.URLError, TimeoutError, OSError):
            if cache is None or not cache.exists():
                raise
            print("Catalog download failed; using last cached copy", file=sys.stderr)
            data = cache.read_bytes()
        obj = json.loads(data)
        obj = validate_catalog(obj)
        if cache is not None:
            temp = cache.with_suffix(".partial")
            temp.write_bytes(data)
            temp.replace(cache)
    else:
        obj = json.loads(Path(location).read_text(encoding="utf-8"))
    return validate_catalog(obj)


def validate_catalog(obj: dict) -> dict:
    if not isinstance(obj, dict) or not isinstance(obj.get("skills"), list):
        raise ValueError("Catalog must be a JSON object with a skills array")
    for entry in obj["skills"]:
        if not isinstance(entry, dict) or not all(k in entry for k in ("id", "repository", "skill_name")):
            raise ValueError("Catalog contains an invalid skill entry")
        if not REPO_PATTERN.fullmatch(entry["repository"]):
            raise ValueError("Unsafe or malformed GitHub repository: " + str(entry["repository"]))
    return obj


def git(args: list[str], cwd: Path | None = None, timeout: int = 180,
        input_data: bytes | None = None, no_lazy_fetch: bool = False) -> bytes:
    env = os.environ.copy()
    env.update({"GIT_TERMINAL_PROMPT": "0", "GIT_LFS_SKIP_SMUDGE": "1"})
    if no_lazy_fetch:
        # Do not allow cat-file to open a network connection per missing object.
        env["GIT_NO_LAZY_FETCH"] = "1"
    command = ["git", "-c", "core.hooksPath=/dev/null", *args]
    proc = subprocess.run(command, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          input=input_data, env=env, timeout=timeout, check=False)
    if proc.returncode != 0:
        msg = proc.stderr.decode("utf-8", errors="replace")[-700:]
        raise RuntimeError(f"git {args[0]} failed: {msg.strip()}")
    return proc.stdout


def repo_cache_path(cache_dir: Path, repo: str) -> Path:
    slug = re.sub(r"[^a-zA-Z0-9_.-]+", "_", repo)
    return cache_dir / (slug + "_" + hashlib.sha256(repo.encode()).hexdigest()[:10])


def git_remote_url(repo: str, transport: str) -> str:
    if transport == "ssh":
        return f"git@github.com:{repo}.git"
    if transport == "https":
        return f"https://github.com/{repo}.git"
    raise ValueError(f"Unsupported transport: {transport}")


def obtain_repo(repo: str, args: argparse.Namespace) -> Path:
    if args.local_repos:
        p = args.local_repos.joinpath(*repo.split("/"))
        if not p.is_dir():
            raise FileNotFoundError(f"Local repository not present: {p}")
        return p
    target = repo_cache_path(args.output / ".repo-cache", repo)
    if target.exists() and not (target / ".git").is_dir():
        # A crash might leave an incomplete cache; remove only our own cache path.
        shutil.rmtree(target)
    if target.exists() and not args.refresh:
        git(["-C", str(target), "rev-parse", "--verify", "HEAD"], timeout=args.timeout)
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_name(target.name + ".partial")
    if temp.exists():
        shutil.rmtree(temp)
    try:
        def clone_once():
            if temp.exists():
                shutil.rmtree(temp)
            # A blobless clone transfers commits/trees but NOT every blob. The
            # subsequent sparse checkout requests all SKILL.md blobs together.
            command = ["clone", "--quiet", "--depth=1", "--no-checkout"]
            if args.fetch_mode == "sparse":
                command.append("--filter=blob:none")
            command.extend(["--", git_remote_url(repo, args.transport), str(temp)])
            git(command, timeout=args.timeout)

        retry_network(clone_once, retries=args.retries, base_delay=args.backoff,
                      max_delay=args.max_backoff, pacer=args.network_pacer,
                      label=f"{repo} clone")
        if target.exists():
            # A throttled --refresh must NOT delete the usable previous cache.
            previous = target.with_name(target.name + ".previous")
            if previous.exists():
                shutil.rmtree(previous)
            target.rename(previous)
            try:
                temp.rename(target)
            except Exception:
                previous.rename(target)
                raise
            shutil.rmtree(previous)
        else:
            temp.rename(target)
    finally:
        if temp.exists():
            shutil.rmtree(temp)
    return target


def safe_relative_path(path: str) -> bool:
    p = PurePosixPath(path)
    return bool(path and not p.is_absolute() and ".." not in p.parts and "\\" not in path
                and "\n" not in path and "\r" not in path and GIT_PATH_RE.fullmatch(path))


def sparse_pattern(path: str) -> str:
    """Translate a Git path to an anchored literal gitignore/sparse pattern."""
    if not safe_relative_path(path):
        raise ValueError(f"Unsafe sparse path: {path!r}")
    return "/" + "".join("\\" + c if c in "*?[]\\" else c for c in path)


def materialize_skill_blobs(repo: str, root: Path, entries: list[tuple[str, str]],
                            args: argparse.Namespace) -> None:
    """Batch-fetch required Git blobs via a single sparse checkout operation.

    This is the key rate-limit fix. On a blobless clone, repeated `git cat-file`
    for each file can cause a remote fetch PER DOCUMENT. A sparse checkout
    causes Git to request all missing blobs together; subsequent reads are
    enforced offline with GIT_NO_LAZY_FETCH.
    """
    if not entries or args.local_repos or args.fetch_mode == "full":
        return
    patterns = "\n".join(sparse_pattern(path) for path, _ in entries) + "\n"
    # A cached clone with different patterns MAY fetch blobs during `set`.
    # Treat both operations as potentially remote and apply the same throttling.
    def set_patterns_once():
        git(["-C", str(root), "sparse-checkout", "set", "--no-cone", "--stdin"],
            timeout=args.timeout, input_data=patterns.encode("utf-8"))

    # On a new --no-checkout clone there is no index/worktree to update, and
    # setting patterns is purely local. An existing indexed cache may fetch.
    set_pacer = args.network_pacer if (root / ".git" / "index").exists() else None
    retry_network(set_patterns_once, retries=args.retries, base_delay=args.backoff,
                  max_delay=args.max_backoff, pacer=set_pacer,
                  label=f"{repo} sparse patterns")

    # Checkout performs Git's batch missing-object retrieval, generally one
    # upload-pack request rather than one lazy request per `cat-file` call.
    def checkout_once():
        git(["-C", str(root), "checkout", "--quiet", "--force", "HEAD"], timeout=args.timeout)

    retry_network(checkout_once, retries=args.retries, base_delay=args.backoff,
                  max_delay=args.max_backoff, pacer=args.network_pacer,
                  label=f"{repo} sparse checkout")


def tracked_skill_files(repo_dir: Path, timeout: int) -> list[tuple[str, str]]:
    data = git(["-C", str(repo_dir), "ls-tree", "-r", "-z", "HEAD"], timeout=timeout)
    files = []
    for record in data.split(b"\0"):
        if not record:
            continue
        try:
            header, raw_path = record.split(b"\t", 1)
            mode, kind, oid = header.decode("ascii").split(" ")
            name = raw_path.decode("utf-8", errors="surrogateescape")
            if kind == "blob" and mode in ("100644", "100755"):
                if PurePosixPath(name).name.lower() == "skill.md" and safe_relative_path(name):
                    files.append((name, oid))
        except (ValueError, UnicodeError):
            continue
    return files


def read_git_blob(repo_dir: Path, oid: str, timeout: int, max_bytes: int) -> str:
    # Checking the blob size before reading prevents unbounded Markdown outputs.
    length = int(git(["-C", str(repo_dir), "cat-file", "-s", oid],
                     timeout=timeout, no_lazy_fetch=True).strip())
    if length > max_bytes:
        raise ValueError(f"SKILL.md too large: {length} bytes (limit {max_bytes})")
    data = git(["-C", str(repo_dir), "cat-file", "blob", oid],
               timeout=timeout, no_lazy_fetch=True)
    return data.decode("utf-8", errors="replace")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def frontmatter_name(body: str) -> str | None:
    if not body.lstrip("\ufeff").startswith("---\n"):
        return None
    header = body.lstrip("\ufeff").split("\n---", 1)[0]
    m = re.search(r"(?m)^name\s*:\s*['\"]?([^'\"#\r\n]+)", header)
    return m.group(1).strip() if m else None


def scan_text(body: str) -> list[dict]:
    matches = []
    lines = body.splitlines()
    for rule in TECHNOLOGIES:
        evidence = []
        n_hits = 0
        strong_found = False
        for line_idx, raw in enumerate(lines, start=1):
            line = raw[:5000]
            matched = None
            for rx in rule["strong_re"]:
                matched = rx.search(line)
                if matched:
                    break
            signal = "configuration_or_command" if matched else "mention"
            if not matched:
                for rx in rule["alias_re"]:
                    matched = rx.search(line)
                    if matched:
                        break
            if matched:
                n_hits += 1
                if signal == "configuration_or_command":
                    strong_found = True
                item = {"line": line_idx, "signal": signal,
                        "matched": matched.group(0)[:100], "excerpt": raw.strip()[:240]}
                if len(evidence) < MAX_EVIDENCE:
                    evidence.append(item)
                elif signal == "configuration_or_command" and not any(
                        e["signal"] == "configuration_or_command" for e in evidence):
                    evidence[-1] = item
        if evidence:
            # A mention is not proof that the technology is a dependency or installed.
            matches.append({
                "technology": rule["name"], "category": rule["category"],
                "classification": "integration_signal" if strong_found else "mentioned",
                "confidence": "medium" if strong_found else "low",
                "evidence_count": n_hits, "evidence": evidence,
                "automatic_detection": {
                    "repo_file_patterns": rule["fingerprints"],
                    "verification_ideas": rule["checks"],
                },
            })
    return matches


def matching_project_fingerprints(paths: list[str]) -> list[dict]:
    """Repository-level context; deliberately NOT attributed to a specific skill."""
    signals = []
    for rule in TECHNOLOGIES:
        globs = rule["fingerprints"]
        found = [p for p in paths if any(fnmatch.fnmatchcase(p, pattern) or
                 fnmatch.fnmatchcase(PurePosixPath(p).name, pattern) for pattern in globs)]
        if found:
            signals.append({"technology": rule["name"], "category": rule["category"],
                            "matching_files": found[:12], "matching_files_count": len(found)})
    return signals


def all_tracked_paths(repo_dir: Path, timeout: int) -> list[str]:
    raw = git(["-C", str(repo_dir), "ls-tree", "-r", "--name-only", "-z", "HEAD"], timeout=timeout)
    return [x.decode("utf-8", errors="replace") for x in raw.split(b"\0") if x]


def safe_save_source(output: Path, repo: str, path: str, body: str) -> None:
    if not safe_relative_path(path):
        raise ValueError("Unsafe path in Git tree")
    target = output / "sources" / repo / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")


def process_repo(repo: str, args: argparse.Namespace) -> dict:
    result = {"repository": repo, "commit": None, "status": "ok", "files": [],
              "project_signals": [], "errors": []}
    try:
        root = obtain_repo(repo, args)
        result["commit"] = git(["-C", str(root), "rev-parse", "HEAD"], timeout=args.timeout).decode().strip()
        entries = tracked_skill_files(root, args.timeout)
        paths = all_tracked_paths(root, args.timeout)
        result["project_signals"] = matching_project_fingerprints(paths)
        materialize_skill_blobs(repo, root, entries, args)
        for name, oid in entries:
            doc = {"path": name, "sha": oid, "status": "ok", "frontmatter_name": None,
                   "technologies": [], "url": f"https://github.com/{repo}/blob/{result['commit']}/{urllib.parse.quote(name, safe='/')}"}
            try:
                body = read_git_blob(root, oid, args.timeout, args.max_file_bytes)
                doc["frontmatter_name"] = frontmatter_name(body)
                doc["technologies"] = scan_text(body)
                if not args.no_save_sources:
                    safe_save_source(args.output, repo, name, body)
            except Exception as exc:
                doc["status"] = "read_error"
                doc["error"] = str(exc)
                result["errors"].append(f"{name}: {exc}")
            result["files"].append(doc)
        if not entries:
            result["status"] = "no_skill_files"
        elif result["errors"]:
            result["status"] = "partial_failure"
    except Exception as exc:
        result["status"] = "repository_error"
        result["errors"].append(str(exc))
    return result


def map_skill(entry: dict, repo_result: dict, repo_skill_count: int) -> dict:
    record = {"id": entry["id"], "repository": entry["repository"],
              "skill_name": entry["skill_name"], "status": "unresolved", "match_reason": None,
              "source_path": None, "source_url": None, "commit": repo_result["commit"],
              "technologies": [], "candidate_paths": []}
    if repo_result["status"] == "repository_error":
        record["status"] = "repository_error"
        record["error"] = "; ".join(repo_result["errors"])
        return record
    files = [f for f in repo_result["files"] if f["status"] == "ok"]
    target = slug(entry["skill_name"])
    candidates = []
    for doc in files:
        folder = slug(PurePosixPath(doc["path"]).parent.name)
        meta = slug(doc.get("frontmatter_name") or "")
        score = (100 if meta == target else 0) + (60 if folder == target else 0)
        if score > 0:
            candidates.append((score, doc))
    if not candidates and repo_skill_count == 1 and len(files) == 1:
        candidates = [(10, files[0])]
    if not candidates:
        record["status"] = "not_found" if repo_result["status"] != "partial_failure" else "missing_or_unreadable"
        return record
    best_score = max(score for score, _ in candidates)
    best = [doc for score, doc in candidates if score == best_score]
    if len(best) > 1:
        record["status"] = "ambiguous"
        record["candidate_paths"] = sorted(doc["path"] for doc in best)
        return record
    chosen = best[0]
    reason = "frontmatter_and_folder" if best_score == 160 else (
        "frontmatter" if best_score == 100 else "folder" if best_score == 60 else "sole_document_in_repository")
    record.update(status="matched", match_reason=reason,
                  source_path=chosen["path"], source_url=chosen["url"], technologies=chosen["technologies"])
    return record


def jsonl_write(path: Path, records: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as dest:
        for obj in records:
            dest.write(json.dumps(obj, ensure_ascii=False) + "\n")


def csv_write(path: Path, fields: list[str], records: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as dest:
        writer = csv.DictWriter(dest, fieldnames=fields)
        writer.writeheader()
        # Prevent spreadsheet formula injection when a public Markdown excerpt
        # happens to start with =, +, -, @, TAB or CR.
        for record in records:
            safe_row = {key: ("'" + val if isinstance(val, str) and val.startswith(("=", "+", "-", "@", "\t", "\r")) else val)
                        for key, val in record.items()}
            writer.writerow(safe_row)


def report(args: argparse.Namespace, catalog: dict, repo_results: dict[str, dict]) -> dict:
    skills = catalog["skills"][:args.limit] if args.limit else catalog["skills"]
    per_repo_counts = collections.Counter(e["repository"] for e in skills)
    catalog_results = [map_skill(e, repo_results[e["repository"]], per_repo_counts[e["repository"]]) for e in skills]
    source_results = []
    repo_signals = []
    for repo, info in sorted(repo_results.items()):
        repo_signals.append({"repository": repo, "commit": info["commit"], "status": info["status"],
                             "project_signals": info["project_signals"], "errors": info["errors"]})
        for doc in info["files"]:
            source_results.append({"repository": repo, "commit": info["commit"], **doc})
    jsonl_write(args.output / "catalog_scans.jsonl", catalog_results)
    jsonl_write(args.output / "source_scans.jsonl", source_results)
    jsonl_write(args.output / "repository_signals.jsonl", repo_signals)
    (args.output / "detection_rules.json").write_text(
        json.dumps([{k: t[k] for k in ("name", "category", "aliases", "strong", "fingerprints", "checks")}
                    for t in TECHNOLOGIES], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    rows = []
    tech_skill_count = collections.Counter()
    for record in catalog_results:
        for t in record["technologies"]:
            tech_skill_count[t["technology"]] += 1
            first = next((e for e in t["evidence"] if e["signal"] == "configuration_or_command"), t["evidence"][0])
            rows.append({"skill_id": record["id"], "technology": t["technology"],
                         "category": t["category"], "classification": t["classification"],
                         "confidence": t["confidence"], "source_url": record["source_url"],
                         "line": first["line"], "evidence": first["excerpt"],
                         "repository_file_signatures": "; ".join(t["automatic_detection"]["repo_file_patterns"]),
                         "verification_ideas": "; ".join(t["automatic_detection"]["verification_ideas"])})
    fields = ["skill_id", "technology", "category", "classification", "confidence", "source_url",
              "line", "evidence", "repository_file_signatures", "verification_ideas"]
    csv_write(args.output / "skill_technologies.csv", fields, rows)
    rules_by_name = {x["name"]: x for x in TECHNOLOGIES}
    summary_rows = [{"technology": name, "category": rules_by_name[name]["category"], "skill_count": count,
                     "repo_file_signatures": "; ".join(rules_by_name[name]["fingerprints"]),
                     "verification_ideas": "; ".join(rules_by_name[name]["checks"])}
                    for name, count in tech_skill_count.most_common()]
    csv_write(args.output / "technology_summary.csv",
              ["technology", "category", "skill_count", "repo_file_signatures", "verification_ideas"], summary_rows)
    unresolved = [{"skill_id": s["id"], "repository": s["repository"], "skill_name": s["skill_name"],
                   "status": s["status"], "candidate_paths": "; ".join(s["candidate_paths"])}
                  for s in catalog_results if s["status"] != "matched"]
    csv_write(args.output / "unresolved.csv", ["skill_id", "repository", "skill_name", "status", "candidate_paths"], unresolved)
    report = {
        "catalog": args.catalog, "catalog_snapshot_date": catalog.get("snapshot_date"),
        "analyzed_at_utc": iso_utc(), "catalog_declared_count": catalog.get("count"),
        "requested_skills": len(skills), "repositories": len(repo_results),
        "repositories_by_status": dict(collections.Counter(v["status"] for v in repo_results.values())),
        "catalog_skills_by_status": dict(collections.Counter(v["status"] for v in catalog_results)),
        "skill_documents_scanned": sum(f["status"] == "ok" for f in source_results),
        "skill_document_errors": sum(f["status"] != "ok" for f in source_results),
        "technology_identifications_for_catalog_skills": len(rows),
        "unique_technologies_identified": len(tech_skill_count),
        "total_registered_technologies": len(TECHNOLOGIES),
        "notes": [
            "Source repositories are inspected at their current local Git HEAD, not at the catalog snapshot date.",
            "No GitHub REST/GraphQL endpoints are called. Remote sparse clones batch-fetch the SKILL.md blobs.",
            "Outbound Git operations are paced and retried on transient throttling errors; remote hosts may still impose limits.",
            "Mentions are not proof of installation; command/config evidence does not guarantee runtime use.",
            "Repository-level file fingerprints must not be attributed automatically to individual skills.",
            "All SKILL.md documents are treated as untrusted text; no skill instructions are executed."
        ]
    }
    (args.output / "run_summary.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", default=DEFAULT_CATALOG, help="Catalog JSON local path or HTTP(S) URL")
    parser.add_argument("--output", type=Path, default=Path("skill-tech-results"))
    parser.add_argument("--workers", type=int, default=2, help="Concurrent repository reads/clones (default: 2)")
    parser.add_argument("--timeout", type=int, default=180, help="Timeout in seconds per Git command")
    parser.add_argument("--limit", type=int, default=0, help="Scan only the first N catalog entries (0=all)")
    parser.add_argument("--max-file-bytes", type=int, default=2_000_000)
    parser.add_argument("--refresh", action="store_true", help="Re-clone repository snapshots, replacing cache")
    parser.add_argument("--fetch-mode", choices=("sparse", "full"), default="sparse",
                        help="sparse=batched SKILL.md blob fetch (default); full=download all blobs up front")
    parser.add_argument("--transport", choices=("https", "ssh"), default="https",
                        help="Git transport; SSH uses existing local SSH credentials")
    parser.add_argument("--request-spacing", type=float, default=2.0,
                        help="Minimum seconds between starts of outbound Git operations (default: 2)")
    parser.add_argument("--retries", type=int, default=5,
                        help="Retries for rate limits and transient network failures (default: 5)")
    parser.add_argument("--backoff", type=float, default=5.0,
                        help="Initial transient-error retry delay in seconds (default: 5)")
    parser.add_argument("--max-backoff", type=float, default=120.0,
                        help="Maximum retry delay before jitter in seconds (default: 120)")
    parser.add_argument("--catalog-cache-ttl", type=int, default=86400,
                        help="Seconds to reuse cached catalog before refreshing (default: 86400)")
    parser.add_argument("--refresh-catalog", action="store_true",
                        help="Fetch catalog again even when the cached copy is fresh")
    parser.add_argument("--no-save-sources", action="store_true", help="Do not write fetched Markdown files to sources/")
    parser.add_argument("--local-repos", type=Path, help="Offline mode: read Git repos under ROOT/owner/repo")
    parser.add_argument("--strict", action="store_true", help="Exit code 2 if a catalog skill cannot be matched")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if (args.workers < 1 or args.timeout < 1 or args.limit < 0 or args.max_file_bytes < 1 or
            args.retries < 0 or args.request_spacing < 0 or args.catalog_cache_ttl < 0 or
            args.backoff < 0 or args.max_backoff < 0 or args.max_backoff < args.backoff):
        raise ValueError("Invalid option: workers/timeout/file-size must be positive, "
                         "limit/retries/spacing/cache-TTL/backoff nonnegative, "
                         "max-backoff >= backoff")
    args.output.mkdir(parents=True, exist_ok=True)
    args.network_pacer = NetworkPacer(args.request_spacing)
    catalog = load_catalog(args.catalog, args.timeout,
                           cache_dir=args.output / ".catalog-cache",
                           cache_ttl=args.catalog_cache_ttl, refresh=args.refresh_catalog,
                           retries=args.retries, backoff=args.backoff,
                           max_backoff=args.max_backoff)
    selected = catalog["skills"][:args.limit] if args.limit else catalog["skills"]
    repos = sorted(set(entry["repository"] for entry in selected))
    print(f"Catalog: {len(selected)} skills in {len(repos)} repositories", file=sys.stderr)
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(process_repo, repo, args): repo for repo in repos}
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            repo = futures[future]
            result = future.result()
            results[repo] = result
            print(f"[{i}/{len(repos)}] {repo}: {result['status']}; "
                  f"{len(result['files'])} SKILL.md files", file=sys.stderr)
    output = report(args, catalog, results)
    print(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"Results written to {args.output.resolve()}", file=sys.stderr)
    return 2 if args.strict and output["catalog_skills_by_status"].get("matched", 0) != len(selected) else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, json.JSONDecodeError, urllib.error.URLError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

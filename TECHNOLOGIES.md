# Technology mappings

Generated from [mappings.json](data/mappings.json). Actual scanner signals are in [detection rules](data/technology-detection-rules.json); detect-only technologies have no recommended skills.

## AI, LLM and MCP

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Aider | `aider` | Detect-only | — |
| Anthropic SDK | `anthropic-sdk` | Mapped | `anthropics/skills/claude-api` |
| Chrome DevTools MCP | `chrome-devtools-mcp` | Detect-only | — |
| Claude Code | `claude-code` | Mapped | `mattpocock/skills/git-guardrails-claude-code` |
| Cline | `cline` | Detect-only | — |
| Cloudflare Agents | `cloudflare-agents` | Mapped | `cloudflare/skills/agents-sdk`, `cloudflare/skills/sandbox-stable` |
| Cloudflare AI | `cloudflare-ai` | Mapped | `cloudflare/skills/agents-sdk` |
| Context7 MCP | `context7-mcp` | Mapped | `sickn33/agentic-awesome-skills/context7-auto-research` |
| Continue | `continue` | Detect-only | — |
| Cursor | `cursor` | Detect-only | — |
| Devin Local | `devin-local` | Detect-only | — |
| Firecrawl | `firecrawl` | Mapped | `firecrawl/cli/firecrawl`, `sickn33/agentic-awesome-skills/firecrawl-scraper` |
| Gemini CLI | `gemini-cli` | Detect-only | — |
| GitHub Copilot | `github-copilot` | Detect-only | — |
| Google Gen AI | `google-genai` | Mapped | `google-gemini/gemini-skills/gemini-api-dev` |
| Hugging Face | `hugging-face` | Mapped | `K-Dense-AI/scientific-agent-skills/transformers`, `sickn33/agentic-awesome-skills/hugging-face-jobs`, `sickn33/agentic-awesome-skills/hugging-face-gradio`, `sickn33/agentic-awesome-skills/hugging-face-papers`, `sickn33/agentic-awesome-skills/hugging-face-trackio` |
| LangChain | `langchain` | Mapped | `langchain-ai/langchain-skills/langchain-rag`, `Mindrally/skills/langchain-development` |
| Langfuse | `langfuse` | Mapped | `langfuse/skills/langfuse` |
| LangGraph | `langgraph` | Mapped | `langchain-ai/deepagents/langgraph-docs`, `sickn33/agentic-awesome-skills/langgraph` |
| LiteLLM | `litellm` | Detect-only | — |
| LlamaIndex | `llamaindex` | Mapped | `Mindrally/skills/llamaindex-development` |
| Mastra | `mastra` | Mapped | `mastra-ai/skills/mastra` |
| Playwright MCP | `mcp-playwright` | Mapped | `anthropics/skills/webapp-testing`, `github/awesome-copilot/playwright-generate-test`, `github/awesome-copilot/playwright-explore-website`, `github/awesome-copilot/playwright-automation-fill-in-form` |
| Model Context Protocol SDK | `mcp-sdk` | Mapped | `github/awesome-copilot/mcp-implementation-security-review`, `github/awesome-copilot/mcp-release-qa`, `Jeffallan/claude-skills/mcp-developer` |
| OpenAI Agents SDK | `openai-agents-sdk` | Detect-only | — |
| OpenAI Codex | `openai-codex` | Detect-only | — |
| OpenAI Docs MCP | `openai-docs-mcp` | Detect-only | — |
| OpenAI SDK | `openai-sdk` | Mapped | `Mindrally/skills/openai-api-development` |
| OpenCode | `opencode` | Detect-only | — |
| OpenTelemetry | `opentelemetry` | Mapped | `confident-ai/deepeval/deepeval-otel` |
| Pydantic AI | `pydantic-ai` | Mapped | `sickn33/agentic-awesome-skills/pydantic-ai` |
| Roo Code | `roo-code` | Detect-only | — |
| Vercel AI SDK | `vercel-ai` | Mapped | `vercel/ai/use-ai-sdk`, `sickn33/agentic-awesome-skills/vercel-ai-sdk-expert` |
| Windsurf | `windsurf` | Detect-only | — |

## Auth and payments

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Auth.js | `auth-js` | Mapped | `Mindrally/skills/nextauth-authentication` |
| Auth0 | `auth0` | Mapped | `Mindrally/skills/auth0-authentication` |
| Better Auth | `better-auth` | Mapped | `better-auth/skills/best-practices`, `better-auth/skills/emailAndPassword`, `better-auth/skills/organization`, `better-auth/skills/twoFactor` |
| Clerk | `clerk` | Mapped | `clerk/skills/clerk`, `clerk/skills/clerk-setup`, `clerk/skills/clerk-custom-ui`, `clerk/skills/clerk-backend-api`, `clerk/skills/clerk-orgs`, `clerk/skills/clerk-webhooks`, `clerk/skills/clerk-testing`, `sickn33/agentic-awesome-skills/clerk-auth` |
| Stripe | `stripe` | Mapped | `stripe/ai/stripe-best-practices`, `stripe/ai/upgrade-stripe`, `Mindrally/skills/stripe`, `sickn33/agentic-awesome-skills/stripe-integration`, `sickn33/agentic-awesome-skills/stripe-automation` |
| WorkOS | `workos` | Detect-only | — |

## Backend frameworks and APIs

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AdonisJS | `adonisjs` | Detect-only | — |
| Blazor | `aspnet-blazor` | Mapped | `github/awesome-copilot/fluentui-blazor`, `Mindrally/skills/blazor` |
| ASP.NET Minimal API | `aspnet-minimal-api` | Mapped | `github/awesome-copilot/aspnet-minimal-api-openapi` |
| ASP.NET Core | `aspnetcore` | Mapped | `github/awesome-copilot/containerize-aspnetcore`, `openai/skills/aspnet-core`, `Jeffallan/claude-skills/dotnet-core-expert`, `Mindrally/skills/aspnet-core` |
| Axum | `axum` | Detect-only | — |
| C# | `csharp` | Mapped | `github/awesome-copilot/csharp-xunit`, `github/awesome-copilot/csharp-async`, `github/awesome-copilot/csharp-docs`, `github/awesome-copilot/csharp-nunit`, `github/awesome-copilot/csharp-mstest`, `github/awesome-copilot/csharp-tunit`, `Jeffallan/claude-skills/csharp-developer`, `Mindrally/skills/c-sharp` |
| Django | `django` | Mapped | `vintasoftware/django-ai-plugins/django-expert`, `affaan-m/everything-claude-code/django-patterns`, `affaan-m/everything-claude-code/django-security`, `Jeffallan/claude-skills/django-expert`, `Mindrally/skills/django-python`, `Mindrally/skills/django-rest-api-development`, `Mindrally/skills/rest-api-django`, `sickn33/agentic-awesome-skills/django-pro`, `sickn33/agentic-awesome-skills/django-perf-review`, `sickn33/agentic-awesome-skills/django-access-review` |
| .NET | `dotnet` | Mapped | `github/awesome-copilot/dotnet-best-practices`, `github/awesome-copilot/dotnet-design-pattern-review`, `github/awesome-copilot/dotnet-upgrade`, `github/awesome-copilot/dotnet-timezone`, `github/awesome-copilot/nuget-manager`, `Mindrally/skills/dotnet`, `Jeffallan/claude-skills/dotnet-core-expert`, `sickn33/agentic-awesome-skills/dotnet-backend-patterns`, `sickn33/agentic-awesome-skills/dotnet-backend`, `sickn33/agentic-awesome-skills/dotnet-architect` |
| Elysia | `elysia` | Mapped | `elysiajs/skills/elysia` |
| Express | `express` | Mapped | `pluginagentmarketplace/custom-plugin-nodejs/express-rest-api`, `Mindrally/skills/express-typescript` |
| FastAPI | `fastapi` | Mapped | `fastapi/fastapi/fastapi`, `wshobson/agents/fastapi-templates`, `mindrally/skills/fastapi-python`, `Jeffallan/claude-skills/fastapi-expert`, `Mindrally/skills/fastapi-microservices-serverless`, `sickn33/agentic-awesome-skills/fastapi-pro`, `sickn33/agentic-awesome-skills/fastapi-router-py` |
| Fastify | `fastify` | Mapped | `mcollina/skills/fastify`, `Mindrally/skills/fastify-typescript` |
| FastMCP | `fastmcp` | Mapped | `sharanharsoor/skills/fastmcp` |
| Flask | `flask` | Mapped | `aj-geddes/useful-ai-prompts/flask-api-development`, `Mindrally/skills/flask-python` |
| GraphQL | `graphql` | Mapped | `apollographql/skills/graphql-operations`, `Mindrally/skills/graphql`, `Jeffallan/claude-skills/graphql-architect`, `Mindrally/skills/apollo-graphql`, `Mindrally/skills/graphql-development`, `sickn33/agentic-awesome-skills/graphql-schema` |
| gRPC | `grpc` | Mapped | `jeremylongshore/tons-of-skills-marketplace/generating-grpc-services`, `Mindrally/skills/grpc-development`, `sickn33/agentic-awesome-skills/grpc-golang` |
| Hono | `hono` | Mapped | `honojs/skills/hono`, `Mindrally/skills/hono-typescript` |
| Java | `java` | Mapped | `github/awesome-copilot/java-docs`, `github/awesome-copilot/java-development`, `github/awesome-copilot/java-debugging`, `github/awesome-copilot/java-diagnostics`, `github/awesome-copilot/java-junit`, `github/awesome-copilot/java-testcontainers`, `github/awesome-copilot/java-upgrade`, `affaan-m/everything-claude-code/java-coding-standards`, `Mindrally/skills/java`, `Jeffallan/claude-skills/java-architect`, `HoangNguyen0403/agent-skills-standard/java-best-practices`, `HoangNguyen0403/agent-skills-standard/java-concurrency`, `HoangNguyen0403/agent-skills-standard/java-language`, `HoangNguyen0403/agent-skills-standard/java-testing`, `HoangNguyen0403/agent-skills-standard/java-tooling`, `sickn33/agentic-awesome-skills/java-pro` |
| Laravel | `laravel` | Mapped | `jeffallan/claude-skills/laravel-specialist`, `affaan-m/everything-claude-code/laravel-patterns`, `Mindrally/skills/laravel`, `Mindrally/skills/laravel-development`, `HoangNguyen0403/agent-skills-standard/laravel-api`, `HoangNguyen0403/agent-skills-standard/laravel-architecture`, `HoangNguyen0403/agent-skills-standard/laravel-background-processing`, `HoangNguyen0403/agent-skills-standard/laravel-clean-architecture`, `HoangNguyen0403/agent-skills-standard/laravel-database-expert`, `HoangNguyen0403/agent-skills-standard/laravel-eloquent`, `HoangNguyen0403/agent-skills-standard/laravel-security`, `HoangNguyen0403/agent-skills-standard/laravel-sessions-middleware`, `HoangNguyen0403/agent-skills-standard/laravel-testing`, `HoangNguyen0403/agent-skills-standard/laravel-tooling`, `sickn33/agentic-awesome-skills/laravel-expert`, `sickn33/agentic-awesome-skills/laravel-security-audit`, `Junaid-PK/laravel-development-workflow/laravel-development-workflow` |
| NestJS | `nestjs` | Mapped | `kadajett/agent-nestjs-skills/nestjs-best-practices`, `Jeffallan/claude-skills/nestjs-expert`, `Mindrally/skills/nestjs-clean-typescript`, `HoangNguyen0403/agent-skills-standard/nestjs-api-standards`, `HoangNguyen0403/agent-skills-standard/nestjs-architecture`, `HoangNguyen0403/agent-skills-standard/nestjs-bullmq`, `HoangNguyen0403/agent-skills-standard/nestjs-caching`, `HoangNguyen0403/agent-skills-standard/nestjs-configuration`, `HoangNguyen0403/agent-skills-standard/nestjs-controllers-services`, `HoangNguyen0403/agent-skills-standard/nestjs-database`, `HoangNguyen0403/agent-skills-standard/nestjs-deployment`, `HoangNguyen0403/agent-skills-standard/nestjs-documentation`, `HoangNguyen0403/agent-skills-standard/nestjs-error-handling`, `HoangNguyen0403/agent-skills-standard/nestjs-file-uploads`, `HoangNguyen0403/agent-skills-standard/nestjs-notification`, `HoangNguyen0403/agent-skills-standard/nestjs-observability`, `HoangNguyen0403/agent-skills-standard/nestjs-performance`, `HoangNguyen0403/agent-skills-standard/nestjs-real-time`, `HoangNguyen0403/agent-skills-standard/nestjs-scheduling`, `HoangNguyen0403/agent-skills-standard/nestjs-search`, `HoangNguyen0403/agent-skills-standard/nestjs-security`, `HoangNguyen0403/agent-skills-standard/nestjs-security-isolation`, `HoangNguyen0403/agent-skills-standard/nestjs-testing`, `HoangNguyen0403/agent-skills-standard/nestjs-transport` |
| Odoo | `odoo` | Mapped | `sickn33/agentic-awesome-skills/odoo-module-developer` |
| Phoenix | `phoenix` | Mapped | `georgeguimaraes/elixir-agent-tools/phoenix`, `Mindrally/skills/phoenix` |
| Quarkus | `quarkus` | Mapped | `Mindrally/skills/quarkus` |
| Requests | `requests` | Mapped | `affaan-m/everything-claude-code/python-patterns` |
| Spring Boot | `springboot` | Mapped | `github/awesome-copilot/java-springboot`, `Jeffallan/claude-skills/spring-boot-engineer`, `Mindrally/skills/java-spring-development`, `Mindrally/skills/spring-boot`, `HoangNguyen0403/agent-skills-standard/spring-boot-api-design`, `HoangNguyen0403/agent-skills-standard/spring-boot-architecture`, `HoangNguyen0403/agent-skills-standard/spring-boot-best-practices`, `HoangNguyen0403/agent-skills-standard/spring-boot-data-access`, `HoangNguyen0403/agent-skills-standard/spring-boot-deployment`, `HoangNguyen0403/agent-skills-standard/spring-boot-microservices`, `HoangNguyen0403/agent-skills-standard/spring-boot-observability`, `HoangNguyen0403/agent-skills-standard/spring-boot-scheduling`, `HoangNguyen0403/agent-skills-standard/spring-boot-security`, `HoangNguyen0403/agent-skills-standard/spring-boot-testing` |
| Symfony | `symfony` | Mapped | `smnandre/symfony-ux-skills/symfony-ux` |
| WordPress | `wordpress` | Mapped | `wordpress/agent-skills/wp-plugin-development`, `wordpress/agent-skills/wp-rest-api`, `wordpress/agent-skills/wp-block-themes`, `wordpress/agent-skills/wp-block-development`, `wordpress/agent-skills/wp-performance`, `wordpress/agent-skills/wordpress-router`, `wordpress/agent-skills/wp-project-triage`, `wordpress/agent-skills/wp-wpcli-and-ops`, `Mindrally/skills/wordpress`, `Jeffallan/claude-skills/wordpress-pro`, `sickn33/agentic-awesome-skills/wordpress-theme-development`, `sickn33/agentic-awesome-skills/wordpress-plugin-development`, `sickn33/agentic-awesome-skills/wordpress-centric-high-seo-optimized-blogwriting-skill`, `sickn33/agentic-awesome-skills/wordpress-woocommerce-development` |

## Build tools, monorepos and release

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Babel | `babel` | Detect-only | — |
| Bazel | `bazel` | Mapped | `ccheney/robust-skills/bazel` |
| Changesets | `changesets` | Mapped | `pingdotgg/t3code/changesets` |
| Gum CLI (Charm) | `charm-gum` | Mapped | `tpscloud/charmedimsure/charmed-gum`, `tpscloud/charmedimsure/charmed-ecosystem` |
| CMake | `cmake` | Detect-only | — |
| direnv | `direnv` | Detect-only | — |
| esbuild | `esbuild` | Mapped | `Mindrally/skills/esbuild-bundler` |
| Just | `just` | Mapped | `paulrberg/agent-skills/cli-just` |
| GNU Make / Make | `make` | Mapped | `akin-ozer/cc-devops-skills/makefile-generator` |
| Meson | `meson` | Detect-only | — |
| mise | `mise` | Mapped | `sickn33/agentic-awesome-skills/mise-configurator` |
| moonrepo | `moonrepo` | Detect-only | — |
| nodemon | `nodemon` | Detect-only | — |
| Nx | `nx` | Mapped | `Mindrally/skills/nx` |
| Poetry | `poetry` | Detect-only | — |
| Rolldown | `rolldown` | Detect-only | — |
| Rollup | `rollup` | Mapped | `Mindrally/skills/rollup-bundler` |
| Rspack | `rspack` | Detect-only | — |
| semantic-release | `semantic-release` | Detect-only | — |
| Task | `task` | Detect-only | — |
| tsdown | `tsdown` | Detect-only | — |
| tsup | `tsup` | Detect-only | — |
| Turborepo | `turborepo` | Mapped | `vercel/turborepo/turborepo`, `Mindrally/skills/turborepo` |
| TypeDoc | `typedoc` | Detect-only | — |
| uv | `uv` | Mapped | `vamseeachanta/workspace-hub/uv-package-manager`, `Paldom/python-skills/python-packaging`, `Mindrally/skills/python-uv` |
| Vite | `vite` | Mapped | `antfu/skills/vite`, `Mindrally/skills/vite` |
| Vite+ | `vite-plus` | Detect-only | — |
| webpack | `webpack` | Mapped | `Mindrally/skills/webpack-bundler` |

## Cloud, infrastructure and CI/CD

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AWS | `aws` | Mapped | `github/awesome-copilot/aws-cloudwatch-investigation`, `github/awesome-copilot/aws-cost-optimize`, `github/awesome-copilot/aws-resource-health-diagnose`, `github/awesome-copilot/aws-resource-query`, `github/awesome-copilot/aws-well-architected-review`, `Mindrally/skills/aws-development`, `sickn33/agentic-awesome-skills/aws-cdk-development` |
| Azure | `azure` | Mapped | `microsoft/github-copilot-for-azure/azure-deploy`, `microsoft/github-copilot-for-azure/azure-ai`, `microsoft/github-copilot-for-azure/azure-diagnostics`, `github/awesome-copilot/azure-architecture-autopilot`, `github/awesome-copilot/azure-deployment-preflight`, `github/awesome-copilot/azure-developer-cli`, `github/awesome-copilot/azure-pricing`, `github/awesome-copilot/azure-resource-health-diagnose`, `github/awesome-copilot/azure-resource-visualizer`, `github/awesome-copilot/azure-well-architected-review`, `github/awesome-copilot/az-cost-optimize`, `Mindrally/skills/azure`, `sickn33/agentic-awesome-skills/azure-devops` |
| Cloudflare | `cloudflare` | Mapped | `cloudflare/skills/cloudflare`, `cloudflare/skills/wrangler`, `cloudflare/skills/workers-best-practices`, `cloudflare/skills/web-perf`, `openai/skills/cloudflare-deploy`, `Mindrally/skills/cloudflare-development` |
| Durable Objects | `cloudflare-durable-objects` | Mapped | `cloudflare/skills/durable-objects` |
| Datadog | `datadog` | Mapped | `sickn33/agentic-awesome-skills/datadog` |
| Dependabot | `dependabot` | Mapped | `cli/cli/dependabot-triager`, `github/awesome-copilot/dependabot` |
| Docker | `docker` | Mapped | `docker/skills/docker-project-foundations`, `github/awesome-copilot/multi-stage-dockerfile`, `Mindrally/skills/docker`, `sickn33/agentic-awesome-skills/docker-expert`, `sickn33/agentic-awesome-skills/docker-compose` |
| GitHub Actions | `github-actions` | Mapped | `github/awesome-copilot/github-actions-efficiency`, `github/awesome-copilot/github-actions-hardening`, `github/awesome-copilot/github-actions-runtime-upgrade-conventions`, `github/awesome-copilot/create-github-action-workflow-specification`, `sickn33/agentic-awesome-skills/github-actions-advanced`, `sickn33/agentic-awesome-skills/github-actions-debugger`, `sickn33/agentic-awesome-skills/github-actions-templates` |
| GitLab CI/CD | `gitlab-ci` | Mapped | `akin-ozer/cc-devops-skills/gitlab-ci-generator`, `sickn33/agentic-awesome-skills/gitlab-ci`, `sickn33/agentic-awesome-skills/gitlab-ci-patterns` |
| Google Cloud | `google-cloud` | Mapped | `rominirani/antigravity-skills/always-verify-gcp`, `Mindrally/skills/gcp-development` |
| Grafana Loki | `grafana-loki` | Mapped | `sickn33/agentic-awesome-skills/loki-logging` |
| Helm | `helm` | Mapped | `TerminalSkills/skills/kubernetes-helm`, `sickn33/agentic-awesome-skills/helm-charts`, `sickn33/agentic-awesome-skills/helm-chart-scaffolding` |
| Kubernetes | `kubernetes` | Mapped | `TerminalSkills/skills/kubernetes-helm`, `Mindrally/skills/kubernetes`, `Jeffallan/claude-skills/kubernetes-specialist`, `sickn33/agentic-awesome-skills/kubernetes-deployment`, `sickn33/agentic-awesome-skills/kubernetes-ops`, `sickn33/agentic-awesome-skills/kubernetes-architect`, `sickn33/agentic-awesome-skills/kubernetes-hardening` |
| Kustomize | `kustomize` | Mapped | `sickn33/agentic-awesome-skills/kustomize` |
| n8n | `n8n` | Mapped | `sickn33/agentic-awesome-skills/n8n-workflow-patterns` |
| Pulumi | `pulumi` | Mapped | `pulumi/agent-skills/pulumi-component` |
| Renovate | `renovate` | Mapped | `backnotprop/plannotator/review-renovate` |
| Sentry | `sentry` | Mapped | `jeremylongshore/tons-of-skills-marketplace/sentry-performance-tracing`, `sickn33/agentic-awesome-skills/sentry-automation` |
| SST | `sst` | Mapped | `zxkane/aws-skills/aws-sst-development` |
| Terraform | `terraform` | Mapped | `hashicorp/agent-skills/terraform-style-guide`, `hashicorp/agent-skills/refactor-module`, `hashicorp/agent-skills/terraform-stacks`, `wshobson/agents/terraform-module-library`, `Mindrally/skills/terraform`, `Jeffallan/claude-skills/terraform-engineer`, `sickn33/agentic-awesome-skills/terraform-infrastructure`, `sickn33/agentic-awesome-skills/terraform-azure` |
| Vercel | `vercel-deploy` | Mapped | `vercel-labs/agent-skills/deploy-to-vercel` |

## Creative, media and graphics

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| React Three Fiber | `@react-three/fiber` | Mapped | `cloudai-x/threejs-skills/threejs-react-three-fiber` |
| VHS terminal recorder (Charm) | `charm-vhs` | Mapped | `tpscloud/charmedimsure/charmed-vhs`, `tpscloud/charmedimsure/charmed-ecosystem` |
| ElevenLabs | `elevenlabs` | Mapped | `inferen-sh/skills/elevenlabs-tts`, `inferen-sh/skills/elevenlabs-music` |
| GSAP | `gsap` | Mapped | `greensock/gsap-skills/gsap-core`, `greensock/gsap-skills/gsap-scrolltrigger`, `greensock/gsap-skills/gsap-performance`, `greensock/gsap-skills/gsap-plugins`, `greensock/gsap-skills/gsap-timeline`, `greensock/gsap-skills/gsap-utils`, `greensock/gsap-skills/gsap-frameworks`, `Mindrally/skills/gsap` |
| Remotion | `remotion` | Mapped | `remotion-dev/skills/remotion-best-practices` |
| Three.js | `threejs` | Mapped | `cloudai-x/threejs-skills/threejs-animation`, `cloudai-x/threejs-skills/threejs-fundamentals`, `cloudai-x/threejs-skills/threejs-shaders`, `cloudai-x/threejs-skills/threejs-geometry`, `cloudai-x/threejs-skills/threejs-interaction`, `cloudai-x/threejs-skills/threejs-materials`, `cloudai-x/threejs-skills/threejs-postprocessing`, `cloudai-x/threejs-skills/threejs-lighting`, `cloudai-x/threejs-skills/threejs-textures`, `cloudai-x/threejs-skills/threejs-loaders`, `Mindrally/skills/three-js` |

## Data, databases and queues

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Apache Airflow | `apache-airflow` | Mapped | `sickn33/agentic-awesome-skills/airflow-dag-patterns` |
| BullMQ | `bullmq` | Mapped | `HoangNguyen0403/agent-skills-standard/nestjs-bullmq`, `sickn33/agentic-awesome-skills/bullmq-specialist` |
| Celery | `celery` | Mapped | `wshobson/agents/python-background-jobs` |
| ClickHouse | `clickhouse` | Mapped | `clickhouse/agent-skills/clickhouse-architecture-advisor` |
| Convex | `convex` | Mapped | `convex/agent-skills/convex`, `Mindrally/skills/convex`, `sickn33/agentic-awesome-skills/convex-backend` |
| dbt | `dbt` | Mapped | `sickn33/agentic-awesome-skills/dbt-transformation-patterns` |
| Drizzle ORM | `drizzle` | Mapped | `bobmatnyc/claude-mpm-skills/drizzle`, `Mindrally/skills/drizzle-orm`, `chaunsin/agent-skills/drizzle-migration-conflict` |
| DuckDB | `duckdb` | Detect-only | — |
| Firebase | `firebase` | Mapped | `firebase/agent-skills/firebase-auth-basics`, `Mindrally/skills/firebase-development`, `sickn33/agentic-awesome-skills/firebase`, `sickn33/agentic-awesome-skills/firebase-app-platform` |
| Inngest | `inngest` | Detect-only | — |
| InstantDB | `instantdb` | Mapped | `instantdb/skills/instantdb` |
| MongoDB | `mongodb` | Mapped | `hoodini/ai-agents-skills/mongodb`, `Mindrally/skills/mongodb-development`, `HoangNguyen0403/agent-skills-standard/database-mongodb` |
| MySQL / MariaDB clients | `mysql` | Mapped | `planetscale/database-skills/mysql`, `Mindrally/skills/mysql-best-practices` |
| Neon Postgres | `neon` | Mapped | `neondatabase/agent-skills/neon-postgres`, `sickn33/agentic-awesome-skills/neon-functions`, `sickn33/agentic-awesome-skills/neon-ai-gateway`, `sickn33/agentic-awesome-skills/neon-object-storage`, `sickn33/agentic-awesome-skills/neon-postgres-branches`, `sickn33/agentic-awesome-skills/neon-postgres-egress-optimizer` |
| NumPy | `numpy` | Mapped | `Mindrally/skills/numpy-best-practices` |
| Pandas | `pandas` | Mapped | `jeffallan/claude-skills/pandas-pro`, `Mindrally/skills/pandas-best-practices` |
| Polars | `polars` | Mapped | `yonesuke/skills/polars` |
| PostgreSQL (JS/Python) | `postgres` | Mapped | `github/awesome-copilot/postgresql-code-review`, `github/awesome-copilot/postgresql-optimization`, `Jeffallan/claude-skills/postgres-pro`, `Mindrally/skills/postgresql-best-practices`, `HoangNguyen0403/agent-skills-standard/database-postgresql`, `sickn33/agentic-awesome-skills/postgres-best-practices`, `sickn33/agentic-awesome-skills/postgres-readonly-queries` |
| Prisma | `prisma` | Mapped | `prisma/skills/prisma-database-setup`, `prisma/skills/prisma-client-api`, `prisma/skills/prisma-cli`, `prisma/skills/prisma-postgres`, `Mindrally/skills/prisma`, `Mindrally/skills/prisma-development`, `sickn33/agentic-awesome-skills/prisma-expert` |
| Pydantic | `pydantic` | Mapped | `bobmatnyc/claude-mpm-skills/pydantic`, `sickn33/agentic-awesome-skills/pydantic-ai`, `sickn33/agentic-awesome-skills/pydantic-models-py` |
| PySpark | `pyspark` | Mapped | `Mindrally/skills/pyspark-etl` |
| PyTorch | `pytorch` | Mapped | `Mindrally/skills/pytorch` |
| Qdrant | `qdrant` | Mapped | `github/awesome-copilot/qdrant-clients-sdk`, `github/awesome-copilot/qdrant-deployment-options`, `github/awesome-copilot/qdrant-model-migration`, `github/awesome-copilot/qdrant-monitoring`, `github/awesome-copilot/qdrant-performance-optimization`, `github/awesome-copilot/qdrant-scaling`, `github/awesome-copilot/qdrant-search-quality`, `github/awesome-copilot/qdrant-version-upgrade` |
| Redis | `redis` | Mapped | `redis/agent-skills/redis-core`, `Mindrally/skills/redis-best-practices`, `HoangNguyen0403/agent-skills-standard/database-redis`, `sickn33/agentic-awesome-skills/redis` |
| Scikit-Learn | `scikit-learn` | Mapped | `davila7/claude-code-templates/scikit-learn`, `davila7/claude-code-templates/senior-data-scientist`, `Mindrally/skills/scikit-learn-best-practices` |
| Sequelize | `sequelize` | Mapped | `Mindrally/skills/sequelize` |
| Snowflake | `snowflake` | Mapped | `sickn33/agentic-awesome-skills/snowflake-development` |
| SQLAlchemy | `sqlalchemy` | Mapped | `bobmatnyc/claude-mpm-skills/sqlalchemy`, `wispbit-ai/skills/sqlalchemy-alembic-expert-best-practices-code-review` |
| SQLite | `sqlite` | Detect-only | — |
| Supabase | `supabase` | Mapped | `supabase/agent-skills/supabase-postgres-best-practices`, `Mindrally/skills/supabase`, `Mindrally/skills/supabase-development`, `sickn33/agentic-awesome-skills/supabase-automation` |
| Temporal | `temporal` | Mapped | `temporalio/skill-temporal-developer/skill-temporal-developer`, `sickn33/agentic-awesome-skills/temporal-golang-pro`, `sickn33/agentic-awesome-skills/temporal-python-testing`, `sickn33/agentic-awesome-skills/temporal-python-pro` |
| TensorFlow | `tensorflow` | Mapped | `Mindrally/skills/tensorflow-deep-learning` |
| Trigger.dev | `trigger-dev` | Mapped | `triggerdotdev/skills/trigger-setup`, `sickn33/agentic-awesome-skills/trigger-dev` |
| Zod | `zod` | Mapped | `pproenca/dot-skills/zod`, `Mindrally/skills/zod-schema-validation`, `sickn33/agentic-awesome-skills/zod-validation-expert` |

## Go ecosystem

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Bubbles (Charm) | `charm-bubbles` | Mapped | `tpscloud/charmedimsure/charmed-bubbles`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Bubble Tea (Charm) | `charm-bubbletea` | Mapped | `tpscloud/charmedimsure/charmed-bubbletea`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Glamour (Charm) | `charm-glamour` | Mapped | `tpscloud/charmedimsure/charmed-glamour`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Huh (Charm) | `charm-huh` | Mapped | `tpscloud/charmedimsure/charmed-huh`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Lip Gloss (Charm) | `charm-lipgloss` | Mapped | `tpscloud/charmedimsure/charmed-lipgloss`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Charm Log | `charm-log` | Mapped | `tpscloud/charmedimsure/charmed-log`, `tpscloud/charmedimsure/charmed-ecosystem` |
| Cobra | `cobra` | Mapped | `samber/cc-skills-golang/golang-spf13-cobra` |
| Gin | `gin` | Detect-only | — |
| Go | `go` | Mapped | `samber/cc-skills-golang/golang-code-style`, `samber/cc-skills-golang/golang-error-handling`, `samber/cc-skills-golang/golang-security`, `samber/cc-skills-golang/golang-testing`, `Mindrally/skills/go`, `eduardo-sl/go-agent-skills/go-api-design`, `eduardo-sl/go-agent-skills/go-architecture-review`, `eduardo-sl/go-agent-skills/go-cli`, `eduardo-sl/go-agent-skills/go-dependency-injection`, `eduardo-sl/go-agent-skills/go-design-patterns`, `eduardo-sl/go-agent-skills/go-graphql`, `eduardo-sl/go-agent-skills/go-grpc`, `eduardo-sl/go-agent-skills/go-interface-design`, `eduardo-sl/go-agent-skills/go-openapi`, `eduardo-sl/go-agent-skills/go-project-layout`, `eduardo-sl/go-agent-skills/go-code-review`, `eduardo-sl/go-agent-skills/go-coding-standards`, `eduardo-sl/go-agent-skills/go-context`, `eduardo-sl/go-agent-skills/go-data-structures`, `eduardo-sl/go-agent-skills/go-documentation`, `eduardo-sl/go-agent-skills/go-error-handling`, `eduardo-sl/go-agent-skills/go-modernize`, `eduardo-sl/go-agent-skills/go-naming`, `eduardo-sl/go-agent-skills/go-database`, `eduardo-sl/go-agent-skills/go-concurrency-review`, `eduardo-sl/go-agent-skills/go-defensive-coding`, `eduardo-sl/go-agent-skills/go-observability`, `eduardo-sl/go-agent-skills/go-performance-review`, `eduardo-sl/go-agent-skills/go-security-audit`, `eduardo-sl/go-agent-skills/go-troubleshooting`, `eduardo-sl/go-agent-skills/go-test-quality`, `eduardo-sl/go-agent-skills/go-test-table-driven`, `eduardo-sl/go-agent-skills/go-binary-size`, `eduardo-sl/go-agent-skills/go-build-release`, `eduardo-sl/go-agent-skills/go-ci`, `eduardo-sl/go-agent-skills/go-dependency-audit`, `eduardo-sl/go-agent-skills/go-refactoring`, `eduardo-sl/go-agent-skills/go-semantic-tools`, `eduardo-sl/go-agent-skills/go-skills-router`, `Jeffallan/claude-skills/golang-pro`, `Mindrally/skills/go-api-development`, `Mindrally/skills/go-backend-microservices`, `HoangNguyen0403/agent-skills-standard/golang-api-server`, `HoangNguyen0403/agent-skills-standard/golang-architecture`, `HoangNguyen0403/agent-skills-standard/golang-concurrency`, `HoangNguyen0403/agent-skills-standard/golang-configuration`, `HoangNguyen0403/agent-skills-standard/golang-database`, `HoangNguyen0403/agent-skills-standard/golang-error-handling`, `HoangNguyen0403/agent-skills-standard/golang-language`, `HoangNguyen0403/agent-skills-standard/golang-logging`, `HoangNguyen0403/agent-skills-standard/golang-security`, `HoangNguyen0403/agent-skills-standard/golang-testing`, `HoangNguyen0403/agent-skills-standard/golang-tooling`, `sickn33/agentic-awesome-skills/go-concurrency-patterns`, `sickn33/agentic-awesome-skills/go-in-depth`, `sickn33/agentic-awesome-skills/go-rust-reverse`, `sickn33/agentic-awesome-skills/go-playwright`, `sickn33/agentic-awesome-skills/go-rod-master` |
| Go GraphQL | `go-graphql` | Mapped | `samber/cc-skills-golang/golang-graphql`, `eduardo-sl/go-agent-skills/go-graphql` |
| Go gRPC | `go-grpc` | Mapped | `samber/cc-skills-golang/golang-grpc`, `eduardo-sl/go-agent-skills/go-grpc` |
| Google Wire | `google-wire` | Mapped | `samber/cc-skills-golang/golang-google-wire` |
| samber/do | `samber-do` | Mapped | `samber/cc-skills-golang/golang-samber-do` |
| samber/hot | `samber-hot` | Mapped | `samber/cc-skills-golang/golang-samber-hot` |
| samber/lo | `samber-lo` | Mapped | `samber/cc-skills-golang/golang-samber-lo` |
| samber/mo | `samber-mo` | Mapped | `samber/cc-skills-golang/golang-samber-mo` |
| samber/oops | `samber-oops` | Mapped | `samber/cc-skills-golang/golang-samber-oops` |
| samber/ro | `samber-ro` | Mapped | `samber/cc-skills-golang/golang-samber-ro` |
| samber/slog | `samber-slog` | Mapped | `samber/cc-skills-golang/golang-samber-slog` |
| Swagger | `swagger` | Mapped | `samber/cc-skills-golang/golang-swagger` |
| Testify | `testify` | Mapped | `samber/cc-skills-golang/golang-stretchr-testify`, `HoangNguyen0403/agent-skills-standard/golang-testing` |
| TuiWeave | `tuiweave` | Mapped | `ishan5ain/tuiweave-agent-kit/tuiweave-app-builder` |
| Uber Dig | `uber-dig` | Mapped | `samber/cc-skills-golang/golang-uber-dig` |
| Uber Fx | `uber-fx` | Mapped | `samber/cc-skills-golang/golang-uber-fx` |
| Viper | `viper` | Mapped | `samber/cc-skills-golang/golang-spf13-viper` |

## Languages, runtimes and scripting

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Bash | `bash` | Mapped | `wshobson/agents/bash-defensive-patterns`, `Mindrally/skills/bash-scripting`, `sickn33/agentic-awesome-skills/bash-pro` |
| Windows batch | `batch` | Mapped | `github/awesome-copilot/batch-files` |
| Bun | `bun` | Mapped | `midudev/autoskills/bun`, `sickn33/agentic-awesome-skills/bun-development` |
| C++ | `cpp` | Mapped | `jeffallan/claude-skills/cpp-pro`, `Mindrally/skills/cpp` |
| Deno | `deno` | Mapped | `denoland/skills/deno` |
| Elixir | `elixir` | Mapped | `georgeguimaraes/elixir-agent-tools/elixir`, `Mindrally/skills/elixir` |
| Fish | `fish` | Detect-only | — |
| Haskell | `haskell` | Detect-only | — |
| Home Assistant | `home-assistant` | Detect-only | — |
| Jinja | `jinja` | Detect-only | — |
| Lua | `lua` | Mapped | `Mindrally/skills/lua` |
| Nix | `nix` | Mapped | `devon-systems/hoenn/nix` |
| Node.js | `node` | Mapped | `wshobson/agents/nodejs-backend-patterns`, `sickn33/antigravity-awesome-skills/nodejs-best-practices`, `Mindrally/skills/nodejs-development`, `HoangNguyen0403/agent-skills-standard/javascript-best-practices`, `HoangNguyen0403/agent-skills-standard/javascript-language`, `HoangNguyen0403/agent-skills-standard/javascript-tooling` |
| PHP | `php` | Mapped | `jeffallan/claude-skills/php-pro`, `Mindrally/skills/php-development`, `HoangNguyen0403/agent-skills-standard/php-best-practices`, `HoangNguyen0403/agent-skills-standard/php-concurrency`, `HoangNguyen0403/agent-skills-standard/php-error-handling`, `HoangNguyen0403/agent-skills-standard/php-language`, `HoangNguyen0403/agent-skills-standard/php-security`, `HoangNguyen0403/agent-skills-standard/php-testing`, `HoangNguyen0403/agent-skills-standard/php-tooling` |
| PowerShell | `powershell` | Detect-only | — |
| Python | `python` | Mapped | `inferen-sh/skills/python-executor`, `wshobson/agents/python-testing-patterns`, `github/awesome-copilot/python-pypi-package-builder`, `Paldom/python-skills/python-ci`, `Paldom/python-skills/python-lint`, `Paldom/python-skills/python-packaging`, `Paldom/python-skills/python-precommit`, `Paldom/python-skills/python-release`, `Paldom/python-skills/python-supply-chain`, `Paldom/python-skills/python-testing`, `Paldom/python-skills/python-typing`, `Mindrally/skills/python`, `Jeffallan/claude-skills/python-pro`, `Mindrally/skills/python-testing`, `Mindrally/skills/python-uv`, `HoangNguyen0403/agent-skills-standard/python-architecture`, `HoangNguyen0403/agent-skills-standard/python-async-runtime`, `HoangNguyen0403/agent-skills-standard/python-best-practices`, `HoangNguyen0403/agent-skills-standard/python-database`, `HoangNguyen0403/agent-skills-standard/python-error-handling`, `HoangNguyen0403/agent-skills-standard/python-language`, `HoangNguyen0403/agent-skills-standard/python-security`, `HoangNguyen0403/agent-skills-standard/python-testing`, `HoangNguyen0403/agent-skills-standard/python-tooling`, `sickn33/agentic-awesome-skills/python-fastapi-development`, `sickn33/agentic-awesome-skills/python-performance-optimization`, `sickn33/agentic-awesome-skills/python-pptx-generator` |
| QML | `qml` | Detect-only | — |
| Ruby | `ruby` | Mapped | `lucianghinda/superpowers-ruby/ruby`, `Mindrally/skills/ruby`, `sickn33/agentic-awesome-skills/ruby-pro` |
| Rust | `rust` | Mapped | `apollographql/skills/rust-best-practices`, `Mindrally/skills/rust`, `Jeffallan/claude-skills/rust-engineer`, `sickn33/agentic-awesome-skills/rust-async-patterns`, `sickn33/agentic-awesome-skills/rust-pro` |
| SuperCollider | `supercollider` | Detect-only | — |
| TypeScript | `typescript` | Mapped | `wshobson/agents/typescript-advanced-types`, `Mindrally/skills/typescript`, `Jeffallan/claude-skills/typescript-pro`, `HoangNguyen0403/agent-skills-standard/react-typescript`, `HoangNguyen0403/agent-skills-standard/typescript-best-practices`, `HoangNguyen0403/agent-skills-standard/typescript-language`, `HoangNguyen0403/agent-skills-standard/typescript-security`, `HoangNguyen0403/agent-skills-standard/typescript-tooling`, `sickn33/agentic-awesome-skills/typescript-expert` |
| Vala | `vala` | Detect-only | — |
| Zsh | `zsh` | Detect-only | — |

## Mobile, desktop and extensions

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Android | `android` | Mapped | `krutikJain/android-agent-skills/android-kotlin-core`, `krutikJain/android-agent-skills/android-compose-foundations`, `krutikJain/android-agent-skills/android-architecture-clean`, `krutikJain/android-agent-skills/android-di-hilt`, `krutikJain/android-agent-skills/android-gradle-build-logic`, `krutikJain/android-agent-skills/android-coroutines-flow`, `krutikJain/android-agent-skills/android-networking-retrofit-okhttp`, `krutikJain/android-agent-skills/android-testing-unit`, `HoangNguyen0403/agent-skills-standard/android-agp-upgrade`, `HoangNguyen0403/agent-skills-standard/android-architecture`, `HoangNguyen0403/agent-skills-standard/android-background-work`, `HoangNguyen0403/agent-skills-standard/android-compose`, `HoangNguyen0403/agent-skills-standard/android-compose-migration`, `HoangNguyen0403/agent-skills-standard/android-concurrency`, `HoangNguyen0403/agent-skills-standard/android-deployment`, `HoangNguyen0403/agent-skills-standard/android-design-system`, `HoangNguyen0403/agent-skills-standard/android-di`, `HoangNguyen0403/agent-skills-standard/android-edge-to-edge`, `HoangNguyen0403/agent-skills-standard/android-legacy-navigation`, `HoangNguyen0403/agent-skills-standard/android-legacy-security`, `HoangNguyen0403/agent-skills-standard/android-legacy-state`, `HoangNguyen0403/agent-skills-standard/android-navigation`, `HoangNguyen0403/agent-skills-standard/android-navigation-3`, `HoangNguyen0403/agent-skills-standard/android-navigation-type-safe`, `HoangNguyen0403/agent-skills-standard/android-networking`, `HoangNguyen0403/agent-skills-standard/android-notifications`, `HoangNguyen0403/agent-skills-standard/android-performance`, `HoangNguyen0403/agent-skills-standard/android-persistence`, `HoangNguyen0403/agent-skills-standard/android-resources`, `HoangNguyen0403/agent-skills-standard/android-security`, `HoangNguyen0403/agent-skills-standard/android-state`, `HoangNguyen0403/agent-skills-standard/android-testing`, `HoangNguyen0403/agent-skills-standard/android-tooling`, `HoangNguyen0403/agent-skills-standard/android-xml-views`, `sickn33/agentic-awesome-skills/android-jetpack-compose-expert`, `sickn33/agentic-awesome-skills/android-dev`, `sickn33/agentic-awesome-skills/android-ui-journey-testing`, `sickn33/agentic-awesome-skills/android-cli` |
| Capacitor | `capacitor` | Detect-only | — |
| Chrome Extension | `chrome-extension` | Mapped | `mindrally/skills/chrome-extension-development`, `sickn33/agentic-awesome-skills/chrome-extension-developer` |
| Dart | `dart` | Mapped | `kevmoo/dash_skills/dart-best-practices`, `HoangNguyen0403/agent-skills-standard/dart-best-practices`, `HoangNguyen0403/agent-skills-standard/dart-language`, `HoangNguyen0403/agent-skills-standard/dart-tooling` |
| Electron | `electron` | Mapped | `Mindrally/skills/electron-development`, `Search-3D/electron-drive-skill/electron-drive-skill` |
| Expo | `expo` | Mapped | `expo/skills/expo-native-ui`, `expo/skills/expo-data-fetching`, `expo/skills/expo-upgrade`, `expo/skills/expo-dev-client`, `expo/skills/eas-app-stores`, `expo/skills/eas-workflows`, `expo/skills/eas-hosting`, `expo/skills/expo-dom`, `Mindrally/skills/expo-react-native-typescript`, `Mindrally/skills/expo-react-native-javascript-best-practices`, `sickn33/agentic-awesome-skills/expo-deployment`, `sickn33/agentic-awesome-skills/expo-cicd-workflows`, `sickn33/agentic-awesome-skills/expo-ui`, `sickn33/agentic-awesome-skills/expo-module`, `sickn33/agentic-awesome-skills/expo-observe` |
| Flutter | `flutter` | Mapped | `jeffallan/claude-skills/flutter-expert`, `madteacher/mad-agents-skills/flutter-animations`, `madteacher/mad-agents-skills/flutter-testing`, `Mindrally/skills/flutter`, `HoangNguyen0403/agent-skills-standard/flutter-auto-route-navigation`, `HoangNguyen0403/agent-skills-standard/flutter-bloc-state-management`, `HoangNguyen0403/agent-skills-standard/flutter-cicd`, `HoangNguyen0403/agent-skills-standard/flutter-concurrency`, `HoangNguyen0403/agent-skills-standard/flutter-dependency-injection`, `HoangNguyen0403/agent-skills-standard/flutter-design-system`, `HoangNguyen0403/agent-skills-standard/flutter-error-handling`, `HoangNguyen0403/agent-skills-standard/flutter-feature-based-clean-architecture`, `HoangNguyen0403/agent-skills-standard/flutter-getx-navigation`, `HoangNguyen0403/agent-skills-standard/flutter-getx-state-management`, `HoangNguyen0403/agent-skills-standard/flutter-go-router-navigation`, `HoangNguyen0403/agent-skills-standard/flutter-idiomatic-flutter`, `HoangNguyen0403/agent-skills-standard/flutter-layer-based-clean-architecture`, `HoangNguyen0403/agent-skills-standard/flutter-localization`, `HoangNguyen0403/agent-skills-standard/flutter-navigation`, `HoangNguyen0403/agent-skills-standard/flutter-notifications`, `HoangNguyen0403/agent-skills-standard/flutter-performance`, `HoangNguyen0403/agent-skills-standard/flutter-retrofit-networking`, `HoangNguyen0403/agent-skills-standard/flutter-riverpod-state-management`, `HoangNguyen0403/agent-skills-standard/flutter-security`, `HoangNguyen0403/agent-skills-standard/flutter-testing`, `HoangNguyen0403/agent-skills-standard/flutter-widgets` |
| Kotlin | `kotlin` | Mapped | `kotlin/kotlin-agent-skills/kotlin-tooling-java-to-kotlin`, `Jeffallan/claude-skills/kotlin-specialist`, `Mindrally/skills/kotlin-development`, `HoangNguyen0403/agent-skills-standard/kotlin-best-practices`, `HoangNguyen0403/agent-skills-standard/kotlin-coroutines`, `HoangNguyen0403/agent-skills-standard/kotlin-language`, `HoangNguyen0403/agent-skills-standard/kotlin-tooling` |
| Kotlin Multiplatform | `kotlin-multiplatform` | Mapped | `Kotlin/kotlin-agent-skills/kotlin-tooling-cocoapods-spm-migration`, `Kotlin/kotlin-agent-skills/kotlin-tooling-agp9-migration` |
| Obsidian | `obsidian` | Mapped | `laude-institute/headlong/obsidian`, `kepano/obsidian-skills/json-canvas`, `kepano/obsidian-skills/obsidian-bases`, `kepano/obsidian-skills/obsidian-cli`, `kepano/obsidian-skills/obsidian-markdown` |
| React Native | `react-native` | Mapped | `sleekdotdesign/agent-skills/design-mobile-apps`, `Jeffallan/claude-skills/react-native-expert`, `Mindrally/skills/react-native-cursor-rules`, `Mindrally/skills/react-native-r3f`, `Mindrally/skills/expo-react-native-typescript`, `Mindrally/skills/expo-react-native-javascript-best-practices`, `HoangNguyen0403/agent-skills-standard/react-native-architecture`, `HoangNguyen0403/agent-skills-standard/react-native-components`, `HoangNguyen0403/agent-skills-standard/react-native-deployment`, `HoangNguyen0403/agent-skills-standard/react-native-dls`, `HoangNguyen0403/agent-skills-standard/react-native-navigation`, `HoangNguyen0403/agent-skills-standard/react-native-navigation-v6`, `HoangNguyen0403/agent-skills-standard/react-native-notifications`, `HoangNguyen0403/agent-skills-standard/react-native-performance`, `HoangNguyen0403/agent-skills-standard/react-native-platform-specific`, `HoangNguyen0403/agent-skills-standard/react-native-security`, `HoangNguyen0403/agent-skills-standard/react-native-state-management`, `HoangNguyen0403/agent-skills-standard/react-native-styling`, `HoangNguyen0403/agent-skills-standard/react-native-testing`, `sickn33/agentic-awesome-skills/react-native-skills` |
| Swift | `swift` | Mapped | `avdlee/swift-concurrency-agent-skill/swift-concurrency`, `Mindrally/skills/swift`, `Jeffallan/claude-skills/swift-expert`, `HoangNguyen0403/agent-skills-standard/swift-best-practices`, `HoangNguyen0403/agent-skills-standard/swift-concurrency`, `HoangNguyen0403/agent-skills-standard/swift-error-handling`, `HoangNguyen0403/agent-skills-standard/swift-language`, `HoangNguyen0403/agent-skills-standard/swift-memory-management`, `HoangNguyen0403/agent-skills-standard/swift-swiftui`, `HoangNguyen0403/agent-skills-standard/swift-testing`, `HoangNguyen0403/agent-skills-standard/swift-tooling` |
| SwiftUI | `swiftui` | Mapped | `avdlee/swiftui-agent-skill/swiftui-expert-skill`, `avdlee/swift-concurrency-agent-skill/swift-concurrency`, `avdlee/xcode-build-optimization-agent-skill/xcode-build-orchestrator`, `avdlee/swift-testing-agent-skill/swift-testing-expert`, `avdlee/core-data-agent-skill/core-data-expert`, `Mindrally/skills/swiftui-development`, `HoangNguyen0403/agent-skills-standard/ios-swiftui`, `HoangNguyen0403/agent-skills-standard/swift-swiftui`, `sickn33/agentic-awesome-skills/swiftui-ui-patterns`, `sickn33/agentic-awesome-skills/swiftui-performance-audit`, `sickn33/agentic-awesome-skills/swiftui-liquid-glass`, `sickn33/agentic-awesome-skills/swiftui-view-refactor`, `sickn33/agentic-awesome-skills/update-swiftui-apis` |
| Tauri | `tauri` | Mapped | `nodnarbnitram/claude-code-extensions/tauri-v2`, `Mindrally/skills/tauri-development` |
| Userscripts | `userscripts` | Detect-only | — |

## Ruby on Rails ecosystem

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| ActiveAdmin | `activeadmin` | Detect-only | — |
| Devise | `devise` | Detect-only | — |
| PostgreSQL (Ruby) | `postgresql-ruby` | Detect-only | — |
| Ruby on Rails | `rails` | Mapped | `sergiodxa/agent-skills/ruby-on-rails-best-practices`, `lucianghinda/superpowers-ruby/rails-guides`, `igmarin/rails-agent-skills/apply-stack-conventions`, `igmarin/rails-agent-skills/review-migration`, `igmarin/rails-agent-skills/security-check`, `ombulabs/claude-code_rails-upgrade-skill/rails-upgrade`, `Jeffallan/claude-skills/rails-expert`, `Mindrally/skills/ruby-rails` |
| Redis (Ruby) | `redis-ruby` | Mapped | `redis/agent-skills/redis-core` |
| Sidekiq | `sidekiq` | Mapped | `igmarin/rails-agent-skills/implement-background-job` |

## Testing and quality

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AVA | `ava` | Detect-only | — |
| Biome | `biome` | Detect-only | — |
| commitlint | `commitlint` | Detect-only | — |
| Cypress | `cypress` | Mapped | `github/awesome-copilot/cypress-flake-fixer`, `Mindrally/skills/cypress`, `sickn33/agentic-awesome-skills/cypress-skill` |
| ESLint | `eslint` | Mapped | `claude-dev-suite/claude-dev-suite/typescript-eslint` |
| Husky | `husky` | Mapped | `mattpocock/skills/setup-pre-commit` |
| Jest | `jest` | Mapped | `github/awesome-copilot/javascript-typescript-jest`, `Mindrally/skills/jest`, `HoangNguyen0403/agent-skills-standard/nextjs-testing`, `sickn33/agentic-awesome-skills/jest-skill` |
| k6 | `k6` | Mapped | `sickn33/agentic-awesome-skills/k6-load-testing` |
| Knip | `knip` | Mapped | `webpro/skills/configure-knip` |
| Lefthook | `lefthook` | Detect-only | — |
| lint-staged | `lint-staged` | Mapped | `mattpocock/skills/setup-pre-commit` |
| oxlint | `oxlint` | Mapped | `delexw/claude-code-misc/oxlint` |
| Playwright | `playwright` | Mapped | `currents-dev/playwright-best-practices-skill/playwright-best-practices`, `Mindrally/skills/playwright`, `Jeffallan/claude-skills/playwright-expert`, `Mindrally/skills/playwright-cursor-rules`, `HoangNguyen0403/agent-skills-standard/nextjs-testing`, `HoangNguyen0403/agent-skills-standard/quality-engineering-playwright-cli`, `HoangNguyen0403/agent-skills-standard/quality-engineering-playwright-pom-generation`, `sickn33/agentic-awesome-skills/playwright-java`, `sickn33/agentic-awesome-skills/playwright-skill` |
| pre-commit | `pre-commit` | Mapped | `Paldom/python-skills/python-precommit` |
| Prettier | `prettier` | Mapped | `thebushidocollective/han/prettier-configuration` |
| Puppeteer | `puppeteer` | Mapped | `Mindrally/skills/puppeteer-automation` |
| Pytest | `pytest` | Mapped | `wshobson/agents/python-testing-patterns`, `github/awesome-copilot/pytest-coverage`, `Paldom/python-skills/python-testing`, `HoangNguyen0403/agent-skills-standard/python-testing`, `sickn33/agentic-awesome-skills/pytest-skill` |
| Robot Framework | `robot-framework` | Mapped | `sickn33/agentic-awesome-skills/robot-framework-skill` |
| RSpec | `rspec` | Mapped | `igmarin/rails-agent-skills/test-service`, `lucianghinda/superpowers-ruby/test-driven-development`, `Mindrally/skills/rspec` |
| RuboCop | `rubocop` | Detect-only | — |
| Ruff | `ruff` | Mapped | `github/awesome-copilot/ruff-recursive-fix`, `Paldom/python-skills/python-lint` |
| Selenium | `selenium` | Mapped | `Mindrally/skills/selenium-automation` |
| Sorbet | `sorbet` | Mapped | `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet`, `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet-inline` |
| Vitest | `vitest` | Mapped | `antfu/skills/vitest`, `HoangNguyen0403/agent-skills-standard/nextjs-testing`, `sickn33/agentic-awesome-skills/vitest-skill` |
| XO | `xo` | Detect-only | — |

## Web frameworks, UI and styling

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Alpine.js | `alpine-js` | Mapped | `Mindrally/skills/alpine-js` |
| Angular | `angular` | Mapped | `angular/skills/angular-developer`, `angular/angular/reference-core`, `angular/angular/reference-signal-forms`, `angular/angular/reference-compiler-cli`, `angular/angular/adev-writing-guide`, `Mindrally/skills/angular`, `Jeffallan/claude-skills/angular-architect`, `Mindrally/skills/angular-development`, `HoangNguyen0403/agent-skills-standard/angular-architecture`, `HoangNguyen0403/agent-skills-standard/angular-components`, `HoangNguyen0403/agent-skills-standard/angular-dependency-injection`, `HoangNguyen0403/agent-skills-standard/angular-directives-pipes`, `HoangNguyen0403/agent-skills-standard/angular-forms`, `HoangNguyen0403/agent-skills-standard/angular-http-client`, `HoangNguyen0403/agent-skills-standard/angular-performance`, `HoangNguyen0403/agent-skills-standard/angular-routing`, `HoangNguyen0403/agent-skills-standard/angular-rxjs-interop`, `HoangNguyen0403/agent-skills-standard/angular-security`, `HoangNguyen0403/agent-skills-standard/angular-ssr`, `HoangNguyen0403/agent-skills-standard/angular-state-management`, `HoangNguyen0403/agent-skills-standard/angular-style-guide`, `HoangNguyen0403/agent-skills-standard/angular-testing`, `HoangNguyen0403/agent-skills-standard/angular-tooling`, `sickn33/agentic-awesome-skills/angular-ui-patterns` |
| Anime.js | `anime-js` | Mapped | `Mindrally/skills/anime-js` |
| Astro | `astro` | Mapped | `astrolicious/agent-skills/astro`, `Mindrally/skills/astro` |
| Chakra UI | `chakra-ui` | Detect-only | — |
| CodeMirror | `codemirror` | Detect-only | — |
| D3 | `d3` | Mapped | `sickn33/agentic-awesome-skills/claude-d3js-skill` |
| htmx | `htmx` | Mapped | `Mindrally/skills/htmx` |
| Ink | `ink` | Detect-only | — |
| Lit | `lit` | Detect-only | — |
| Monaco Editor | `monaco-editor` | Detect-only | — |
| Mock Service Worker | `msw` | Mapped | `pymodel/react-frontend-skills/msw`, `HoangNguyen0403/agent-skills-standard/nextjs-testing` |
| Next.js | `nextjs` | Mapped | `vercel/next.js/next-cache-components-adoption`, `Jeffallan/claude-skills/nextjs-developer`, `Mindrally/skills/nextjs-react-typescript`, `Mindrally/skills/optimized-nextjs-typescript`, `HoangNguyen0403/agent-skills-standard/nextjs-app-router`, `HoangNguyen0403/agent-skills-standard/nextjs-architecture`, `HoangNguyen0403/agent-skills-standard/nextjs-authentication`, `HoangNguyen0403/agent-skills-standard/nextjs-caching`, `HoangNguyen0403/agent-skills-standard/nextjs-data-access-layer`, `HoangNguyen0403/agent-skills-standard/nextjs-data-fetching`, `HoangNguyen0403/agent-skills-standard/nextjs-i18n`, `HoangNguyen0403/agent-skills-standard/nextjs-optimization`, `HoangNguyen0403/agent-skills-standard/nextjs-pages-router`, `HoangNguyen0403/agent-skills-standard/nextjs-rendering`, `HoangNguyen0403/agent-skills-standard/nextjs-security`, `HoangNguyen0403/agent-skills-standard/nextjs-server-actions`, `HoangNguyen0403/agent-skills-standard/nextjs-server-components`, `HoangNguyen0403/agent-skills-standard/nextjs-state-management`, `HoangNguyen0403/agent-skills-standard/nextjs-styling`, `HoangNguyen0403/agent-skills-standard/nextjs-testing`, `HoangNguyen0403/agent-skills-standard/nextjs-tooling`, `HoangNguyen0403/agent-skills-standard/nextjs-upgrade`, `sickn33/agentic-awesome-skills/nextjs-app-router-patterns`, `sickn33/agentic-awesome-skills/nextjs-seo-indexing`, `sickn33/agentic-awesome-skills/nextjs-best-practices`, `sickn33/agentic-awesome-skills/react-nextjs-development`, `sickn33/agentic-awesome-skills/nextjs-supabase-auth` |
| Nuxt | `nuxt` | Mapped | `antfu/skills/nuxt`, `Mindrally/skills/nuxtjs-vue-typescript` |
| Pinia | `pinia` | Mapped | `vuejs-ai/skills/vue-pinia-best-practices`, `Mindrally/skills/vue-pinia` |
| Preact | `preact` | Mapped | `av/skills/preact-buildless-frontend` |
| Qwik | `qwik` | Detect-only | — |
| Radix UI | `radix-ui` | Mapped | `claude-dev-suite/claude-dev-suite/radix-ui` |
| React | `react` | Mapped | `vercel-labs/agent-skills/react-best-practices`, `vercel-labs/agent-skills/composition-patterns`, `Mindrally/skills/react`, `Jeffallan/claude-skills/react-expert`, `HoangNguyen0403/agent-skills-standard/react-component-patterns`, `HoangNguyen0403/agent-skills-standard/react-hooks`, `HoangNguyen0403/agent-skills-standard/react-native-architecture`, `HoangNguyen0403/agent-skills-standard/react-native-components`, `HoangNguyen0403/agent-skills-standard/react-native-deployment`, `HoangNguyen0403/agent-skills-standard/react-native-dls`, `HoangNguyen0403/agent-skills-standard/react-native-navigation`, `HoangNguyen0403/agent-skills-standard/react-native-navigation-v6`, `HoangNguyen0403/agent-skills-standard/react-native-notifications`, `HoangNguyen0403/agent-skills-standard/react-native-performance`, `HoangNguyen0403/agent-skills-standard/react-native-platform-specific`, `HoangNguyen0403/agent-skills-standard/react-native-security`, `HoangNguyen0403/agent-skills-standard/react-native-state-management`, `HoangNguyen0403/agent-skills-standard/react-native-styling`, `HoangNguyen0403/agent-skills-standard/react-native-testing`, `HoangNguyen0403/agent-skills-standard/react-performance`, `HoangNguyen0403/agent-skills-standard/react-security`, `HoangNguyen0403/agent-skills-standard/react-state-management`, `HoangNguyen0403/agent-skills-standard/react-testing`, `HoangNguyen0403/agent-skills-standard/react-tooling`, `HoangNguyen0403/agent-skills-standard/react-typescript`, `sickn33/agentic-awesome-skills/react-patterns`, `sickn33/agentic-awesome-skills/react-nextjs-development`, `sickn33/agentic-awesome-skills/react-component-performance` |
| React Hook Form | `react-hook-form` | Mapped | `pproenca/dot-skills/react-hook-form` |
| React Router | `react-router` | Mapped | `remix-run/react-router/react-router`, `Mindrally/skills/react-router-v7` |
| Recharts | `recharts` | Mapped | `TerminalSkills/skills/recharts` |
| Redux | `redux` | Mapped | `davila7/claude-code-templates/react-state-management`, `Mindrally/skills/redux-toolkit` |
| remark / rehype / unified | `remark-rehype-unified` | Detect-only | — |
| shadcn/ui | `shadcn` | Mapped | `shadcn/ui/shadcn` |
| Shopify | `shopify` | Mapped | `sickn33/agentic-awesome-skills/shopify-development` |
| SolidJS | `solidjs` | Detect-only | — |
| Storybook | `storybook` | Mapped | `Mindrally/skills/storybook` |
| Svelte | `svelte` | Mapped | `ejirocodes/agent-skills/svelte5-best-practices`, `sveltejs/ai-tools/svelte-code-writer`, `Mindrally/skills/svelte` |
| SvelteKit | `sveltekit` | Mapped | `spences10/svelte-skills-kit/sveltekit-structure`, `Mindrally/skills/sveltekit` |
| Tailwind CSS | `tailwind` | Mapped | `giuseppe-trisciuoglio/developer-kit/tailwind-css-patterns`, `Mindrally/skills/tailwindcss` |
| TanStack Form | `tanstack-form` | Detect-only | — |
| TanStack Query | `tanstack-query` | Mapped | `deckardger/tanstack-agent-skills/tanstack-query`, `Mindrally/skills/tanstack-query`, `Mindrally/skills/react-query`, `sickn33/agentic-awesome-skills/tanstack-query-expert` |
| TanStack Start | `tanstack-start` | Mapped | `tanstack-skills/tanstack-skills/tanstack-start`, `Mindrally/skills/tanstack-start` |
| TanStack Table | `tanstack-table` | Mapped | `TerminalSkills/skills/tanstack-table` |
| tRPC | `trpc` | Mapped | `Mindrally/skills/trpc`, `sickn33/agentic-awesome-skills/trpc-fullstack` |
| UnoCSS | `unocss` | Mapped | `antfu/skills/unocss` |
| Vue | `vue` | Mapped | `hyf0/vue-skills/vue-debug-guides`, `antfu/skills/vue`, `vuejs-ai/skills/vue-best-practices`, `Jeffallan/claude-skills/vue-expert`, `Jeffallan/claude-skills/vue-expert-js`, `Mindrally/skills/vue-typescript`, `Mindrally/skills/vuejs-typescript-best-practices` |
| Zustand | `zustand` | Mapped | `Mindrally/skills/zustand-state-management`, `sickn33/agentic-awesome-skills/zustand-store-ts` |

## Combinations

Requires are evaluated together using Nosey's normal scope policy.

| Name | ID | Requires | Skills |
| --- | --- | --- | --- |
| Android + Clerk | `android-clerk` | `android` + `clerk` | `clerk/skills/clerk-android`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Astro + Clerk | `astro-clerk` | `astro` + `clerk` | `clerk/skills/clerk-astro-patterns` |
| Chrome Extension + Clerk | `chrome-extension-clerk` | `chrome-extension` + `clerk` | `clerk/skills/clerk-chrome-extension-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Cloudflare + Vite | `cloudflare-vite` | `cloudflare` + `vite` | `cloudflare/vinext/migrate-to-vinext` |
| Cursor + Next.js + Redux + TypeScript | `cursor-nextjs-redux-typescript` | `cursor` + `nextjs` + `redux` + `typescript` | `Mindrally/skills/nextjs-react-redux-typescript-cursor-rules` |
| Cursor + Odoo | `cursor-odoo` | `cursor` + `odoo` | `Mindrally/skills/python-odoo-cursor-rules` |
| Django + Celery | `django-celery` | `django` + `celery` | `affaan-m/ECC/django-celery` |
| Docker + Node.js | `docker-node` | `docker` + `node` | `bobmatnyc/claude-mpm-skills/docker` |
| Docker + Python | `docker-python` | `docker` + `python` | `bobmatnyc/claude-mpm-skills/docker` |
| Expo + Clerk | `expo-clerk` | `expo` + `clerk` | `clerk/skills/clerk-expo` |
| FastAPI + SQLAlchemy | `fastapi-sqlalchemy` | `fastapi` + `sqlalchemy` | `affaan-m/ECC/fastapi-patterns` |
| GSAP + React | `gsap-react` | `gsap` + `react` | `greensock/gsap-skills/gsap-react` |
| Next.js + Clerk | `nextjs-clerk` | `nextjs` + `clerk` | `clerk/skills/clerk-nextjs-patterns` |
| Next.js + Drizzle | `nextjs-drizzle` | `nextjs` + `drizzle` | `davila7/claude-code-templates/drizzle-orm-expert` |
| Next.js + Playwright | `nextjs-playwright` | `nextjs` + `playwright` | `currents-dev/playwright-best-practices-skill/playwright-best-practices` |
| Next.js + Prisma | `nextjs-prisma` | `nextjs` + `prisma` | `affaan-m/ECC/prisma-patterns` |
| Next.js + Supabase | `nextjs-supabase` | `nextjs` + `supabase` | `supabase/agent-skills/supabase-postgres-best-practices`, `Mindrally/skills/nextjs-typescript-tailwindcss-supabase` |
| Next.js + tRPC | `nextjs-trpc` | `nextjs` + `trpc` | `Mindrally/skills/trpc` |
| Next.js + Vercel AI SDK | `nextjs-vercel-ai` | `nextjs` + `vercel-ai` | `vercel/ai/use-ai-sdk` |
| Node.js + Express | `node-express` | `node` + `express` | `aj-geddes/useful-ai-prompts/nodejs-express-server` |
| Nuxt + Clerk | `nuxt-clerk` | `nuxt` + `clerk` | `clerk/skills/clerk-nuxt-patterns` |
| Ruby on Rails + RSpec | `rails-rspec` | `rails` + `rspec` | `igmarin/rails-agent-skills/plan-tests`, `igmarin/ruby-core-skills/triage-bug` |
| React + Clerk | `react-clerk` | `react` + `clerk` | `clerk/skills/clerk-react-patterns` |
| React Hook Form + Zod | `react-hook-form-zod` | `react-hook-form` + `zod` | `pproenca/dot-skills/zod` |
| React Native + Expo | `react-native-expo` | `react-native` + `expo` | `expo/skills/expo-native-ui`, `sleekdotdesign/agent-skills/design-mobile-apps`, `Mindrally/skills/expo-react-native-typescript`, `Mindrally/skills/expo-react-native-javascript-best-practices` |
| React + React Three Fiber | `react-react-three-fiber` | `threejs` + `react` + `@react-three/fiber` | `vercel-labs/json-render/react-three-fiber` |
| React Router + Clerk | `react-router-clerk` | `react-router` + `clerk` | `clerk/skills/clerk-react-router-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| React + shadcn/ui | `react-shadcn` | `react` + `shadcn` | `shadcn/ui/shadcn`, `vercel-labs/agent-skills/react-best-practices` |
| React + TanStack Query | `react-tanstack-query` | `react` + `tanstack-query` | `Mindrally/skills/tanstack-query`, `Mindrally/skills/react-query` |
| React + Zustand | `react-zustand` | `react` + `zustand` | `Mindrally/skills/zustand-state-management` |
| SwiftUI + Clerk | `swiftui-clerk` | `swiftui` + `clerk` | `clerk/skills/clerk-swift`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Tailwind CSS + shadcn/ui | `tailwind-shadcn` | `tailwind` + `shadcn` | `secondsky/claude-skills/tailwind-v4-shadcn` |
| TanStack Start + Clerk | `tanstack-clerk` | `tanstack-start` + `clerk` | `clerk/skills/clerk-tanstack-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Terraform + Azure | `terraform-azure` | `terraform` + `azure` | `github/awesome-copilot/terraform-azurerm-set-diff-analyzer` |
| Vue + Clerk | `vue-clerk` | `vue` + `clerk` | `clerk/skills/clerk-vue-patterns` |

## Frontend essentials

`anthropics/skills/frontend-design`, `addyosmani/web-quality-skills/accessibility`, `addyosmani/web-quality-skills/seo`

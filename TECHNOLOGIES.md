# Technology mappings

Generated from [mappings.json](data/mappings.json). Actual scanner signals are in [detection rules](data/technology-detection-rules.json); detect-only technologies have no recommended skills.

## AI, LLM and MCP

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Anthropic SDK | `anthropic-sdk` | Mapped | `anthropics/skills/claude-api` |
| Chrome DevTools MCP | `chrome-devtools-mcp` | Detect-only | — |
| Cloudflare Agents | `cloudflare-agents` | Mapped | `cloudflare/skills/agents-sdk`, `cloudflare/skills/sandbox-stable` |
| Cloudflare AI | `cloudflare-ai` | Mapped | `cloudflare/skills/agents-sdk` |
| Context7 MCP | `context7-mcp` | Detect-only | — |
| Firecrawl | `firecrawl` | Mapped | `firecrawl/cli/firecrawl` |
| Google Gen AI | `google-genai` | Mapped | `google-gemini/gemini-skills/gemini-api-dev` |
| Hugging Face | `hugging-face` | Mapped | `K-Dense-AI/scientific-agent-skills/transformers` |
| LangChain | `langchain` | Mapped | `langchain-ai/langchain-skills/langchain-rag` |
| Langfuse | `langfuse` | Mapped | `langfuse/skills/langfuse` |
| LangGraph | `langgraph` | Mapped | `langchain-ai/deepagents/langgraph-docs` |
| LiteLLM | `litellm` | Detect-only | — |
| LlamaIndex | `llamaindex` | Detect-only | — |
| Mastra | `mastra` | Mapped | `mastra-ai/skills/mastra` |
| Playwright MCP | `mcp-playwright` | Mapped | `anthropics/skills/webapp-testing`, `github/awesome-copilot/playwright-generate-test`, `github/awesome-copilot/playwright-explore-website`, `github/awesome-copilot/playwright-automation-fill-in-form` |
| Model Context Protocol SDK | `mcp-sdk` | Mapped | `github/awesome-copilot/mcp-implementation-security-review`, `github/awesome-copilot/mcp-release-qa` |
| OpenAI Agents SDK | `openai-agents-sdk` | Detect-only | — |
| OpenAI Docs MCP | `openai-docs-mcp` | Detect-only | — |
| OpenAI SDK | `openai-sdk` | Detect-only | — |
| OpenTelemetry | `opentelemetry` | Mapped | `confident-ai/deepeval/deepeval-otel` |
| Pydantic AI | `pydantic-ai` | Detect-only | — |
| Vercel AI SDK | `vercel-ai` | Mapped | `vercel/ai/use-ai-sdk` |

## Auth and payments

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Auth.js | `auth-js` | Detect-only | — |
| Better Auth | `better-auth` | Mapped | `better-auth/skills/best-practices`, `better-auth/skills/emailAndPassword`, `better-auth/skills/organization`, `better-auth/skills/twoFactor` |
| Clerk | `clerk` | Mapped | `clerk/skills/clerk`, `clerk/skills/clerk-setup`, `clerk/skills/clerk-custom-ui`, `clerk/skills/clerk-backend-api`, `clerk/skills/clerk-orgs`, `clerk/skills/clerk-webhooks`, `clerk/skills/clerk-testing` |
| Stripe | `stripe` | Mapped | `stripe/ai/stripe-best-practices`, `stripe/ai/upgrade-stripe` |
| WorkOS | `workos` | Detect-only | — |

## Backend frameworks and APIs

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AdonisJS | `adonisjs` | Detect-only | — |
| Blazor | `aspnet-blazor` | Mapped | `github/awesome-copilot/fluentui-blazor` |
| ASP.NET Minimal API | `aspnet-minimal-api` | Mapped | `github/awesome-copilot/aspnet-minimal-api-openapi` |
| ASP.NET Core | `aspnetcore` | Mapped | `github/awesome-copilot/containerize-aspnetcore`, `openai/skills/aspnet-core` |
| Axum | `axum` | Detect-only | — |
| C# | `csharp` | Mapped | `github/awesome-copilot/csharp-xunit`, `github/awesome-copilot/csharp-async`, `github/awesome-copilot/csharp-docs`, `github/awesome-copilot/csharp-nunit`, `github/awesome-copilot/csharp-mstest`, `github/awesome-copilot/csharp-tunit` |
| Django | `django` | Mapped | `vintasoftware/django-ai-plugins/django-expert`, `affaan-m/everything-claude-code/django-patterns`, `affaan-m/everything-claude-code/django-security` |
| .NET | `dotnet` | Mapped | `github/awesome-copilot/dotnet-best-practices`, `github/awesome-copilot/dotnet-design-pattern-review`, `github/awesome-copilot/dotnet-upgrade`, `github/awesome-copilot/dotnet-timezone`, `github/awesome-copilot/nuget-manager` |
| Elysia | `elysia` | Mapped | `elysiajs/skills/elysia` |
| Express | `express` | Mapped | `pluginagentmarketplace/custom-plugin-nodejs/express-rest-api` |
| FastAPI | `fastapi` | Mapped | `fastapi/fastapi/fastapi`, `wshobson/agents/fastapi-templates`, `mindrally/skills/fastapi-python` |
| Fastify | `fastify` | Mapped | `mcollina/skills/fastify` |
| FastMCP | `fastmcp` | Mapped | `sharanharsoor/skills/fastmcp` |
| Flask | `flask` | Mapped | `aj-geddes/useful-ai-prompts/flask-api-development` |
| GraphQL | `graphql` | Mapped | `apollographql/skills/graphql-operations` |
| gRPC | `grpc` | Mapped | `jeremylongshore/tons-of-skills-marketplace/generating-grpc-services` |
| Hono | `hono` | Mapped | `honojs/skills/hono` |
| Java | `java` | Mapped | `github/awesome-copilot/java-docs`, `github/awesome-copilot/java-development`, `github/awesome-copilot/java-debugging`, `github/awesome-copilot/java-diagnostics`, `github/awesome-copilot/java-junit`, `github/awesome-copilot/java-testcontainers`, `github/awesome-copilot/java-upgrade`, `affaan-m/everything-claude-code/java-coding-standards` |
| Laravel | `laravel` | Mapped | `jeffallan/claude-skills/laravel-specialist`, `affaan-m/everything-claude-code/laravel-patterns` |
| NestJS | `nestjs` | Mapped | `kadajett/agent-nestjs-skills/nestjs-best-practices` |
| Phoenix | `phoenix` | Mapped | `georgeguimaraes/elixir-agent-tools/phoenix` |
| Requests | `requests` | Mapped | `affaan-m/everything-claude-code/python-patterns` |
| Spring Boot | `springboot` | Mapped | `github/awesome-copilot/java-springboot` |
| Symfony | `symfony` | Mapped | `smnandre/symfony-ux-skills/symfony-ux` |
| WordPress | `wordpress` | Mapped | `wordpress/agent-skills/wp-plugin-development`, `wordpress/agent-skills/wp-rest-api`, `wordpress/agent-skills/wp-block-themes`, `wordpress/agent-skills/wp-block-development`, `wordpress/agent-skills/wp-performance`, `wordpress/agent-skills/wordpress-router`, `wordpress/agent-skills/wp-project-triage`, `wordpress/agent-skills/wp-wpcli-and-ops` |

## Build tools, monorepos and release

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Babel | `babel` | Detect-only | — |
| Bazel | `bazel` | Mapped | `ccheney/robust-skills/bazel` |
| Changesets | `changesets` | Mapped | `pingdotgg/t3code/changesets` |
| CMake | `cmake` | Detect-only | — |
| direnv | `direnv` | Detect-only | — |
| esbuild | `esbuild` | Mapped | `Mindrally/skills/esbuild-bundler` |
| Just | `just` | Mapped | `paulrberg/agent-skills/cli-just` |
| GNU Make / Make | `make` | Mapped | `akin-ozer/cc-devops-skills/makefile-generator` |
| Meson | `meson` | Detect-only | — |
| mise | `mise` | Detect-only | — |
| moonrepo | `moonrepo` | Detect-only | — |
| nodemon | `nodemon` | Detect-only | — |
| Nx | `nx` | Detect-only | — |
| Poetry | `poetry` | Detect-only | — |
| Rolldown | `rolldown` | Detect-only | — |
| Rollup | `rollup` | Mapped | `Mindrally/skills/rollup-bundler` |
| Rspack | `rspack` | Detect-only | — |
| semantic-release | `semantic-release` | Detect-only | — |
| Task | `task` | Detect-only | — |
| tsdown | `tsdown` | Detect-only | — |
| tsup | `tsup` | Detect-only | — |
| Turborepo | `turborepo` | Mapped | `vercel/turborepo/turborepo` |
| TypeDoc | `typedoc` | Detect-only | — |
| uv | `uv` | Mapped | `vamseeachanta/workspace-hub/uv-package-manager`, `Paldom/python-skills/python-packaging` |
| Vite | `vite` | Mapped | `antfu/skills/vite` |
| Vite+ | `vite-plus` | Detect-only | — |
| webpack | `webpack` | Mapped | `Mindrally/skills/webpack-bundler` |

## Cloud, infrastructure and CI/CD

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AWS | `aws` | Mapped | `github/awesome-copilot/aws-cloudwatch-investigation`, `github/awesome-copilot/aws-cost-optimize`, `github/awesome-copilot/aws-resource-health-diagnose`, `github/awesome-copilot/aws-resource-query`, `github/awesome-copilot/aws-well-architected-review` |
| Azure | `azure` | Mapped | `microsoft/github-copilot-for-azure/azure-deploy`, `microsoft/github-copilot-for-azure/azure-ai`, `microsoft/github-copilot-for-azure/azure-diagnostics`, `github/awesome-copilot/azure-architecture-autopilot`, `github/awesome-copilot/azure-deployment-preflight`, `github/awesome-copilot/azure-developer-cli`, `github/awesome-copilot/azure-pricing`, `github/awesome-copilot/azure-resource-health-diagnose`, `github/awesome-copilot/azure-resource-visualizer`, `github/awesome-copilot/azure-well-architected-review`, `github/awesome-copilot/az-cost-optimize` |
| Cloudflare | `cloudflare` | Mapped | `cloudflare/skills/cloudflare`, `cloudflare/skills/wrangler`, `cloudflare/skills/workers-best-practices`, `cloudflare/skills/web-perf`, `openai/skills/cloudflare-deploy` |
| Durable Objects | `cloudflare-durable-objects` | Mapped | `cloudflare/skills/durable-objects` |
| Dependabot | `dependabot` | Mapped | `cli/cli/dependabot-triager`, `github/awesome-copilot/dependabot` |
| Docker | `docker` | Mapped | `docker/skills/docker-project-foundations`, `github/awesome-copilot/multi-stage-dockerfile` |
| GitHub Actions | `github-actions` | Mapped | `github/awesome-copilot/github-actions-efficiency`, `github/awesome-copilot/github-actions-hardening`, `github/awesome-copilot/github-actions-runtime-upgrade-conventions`, `github/awesome-copilot/create-github-action-workflow-specification` |
| GitLab CI/CD | `gitlab-ci` | Mapped | `akin-ozer/cc-devops-skills/gitlab-ci-generator` |
| Google Cloud | `google-cloud` | Mapped | `rominirani/antigravity-skills/always-verify-gcp` |
| Helm | `helm` | Mapped | `TerminalSkills/skills/kubernetes-helm` |
| Kubernetes | `kubernetes` | Mapped | `TerminalSkills/skills/kubernetes-helm` |
| Pulumi | `pulumi` | Mapped | `pulumi/agent-skills/pulumi-component` |
| Renovate | `renovate` | Mapped | `backnotprop/plannotator/review-renovate` |
| Sentry | `sentry` | Mapped | `jeremylongshore/tons-of-skills-marketplace/sentry-performance-tracing` |
| SST | `sst` | Mapped | `zxkane/aws-skills/aws-sst-development` |
| Terraform | `terraform` | Mapped | `hashicorp/agent-skills/terraform-style-guide`, `hashicorp/agent-skills/refactor-module`, `hashicorp/agent-skills/terraform-stacks`, `wshobson/agents/terraform-module-library` |
| Vercel | `vercel-deploy` | Mapped | `vercel-labs/agent-skills/deploy-to-vercel` |

## Creative, media and graphics

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| React Three Fiber | `@react-three/fiber` | Mapped | `cloudai-x/threejs-skills/threejs-react-three-fiber` |
| ElevenLabs | `elevenlabs` | Mapped | `inferen-sh/skills/elevenlabs-tts`, `inferen-sh/skills/elevenlabs-music` |
| GSAP | `gsap` | Mapped | `greensock/gsap-skills/gsap-core`, `greensock/gsap-skills/gsap-scrolltrigger`, `greensock/gsap-skills/gsap-performance`, `greensock/gsap-skills/gsap-plugins`, `greensock/gsap-skills/gsap-timeline`, `greensock/gsap-skills/gsap-utils`, `greensock/gsap-skills/gsap-frameworks` |
| Remotion | `remotion` | Mapped | `remotion-dev/skills/remotion-best-practices` |
| Three.js | `threejs` | Mapped | `cloudai-x/threejs-skills/threejs-animation`, `cloudai-x/threejs-skills/threejs-fundamentals`, `cloudai-x/threejs-skills/threejs-shaders`, `cloudai-x/threejs-skills/threejs-geometry`, `cloudai-x/threejs-skills/threejs-interaction`, `cloudai-x/threejs-skills/threejs-materials`, `cloudai-x/threejs-skills/threejs-postprocessing`, `cloudai-x/threejs-skills/threejs-lighting`, `cloudai-x/threejs-skills/threejs-textures`, `cloudai-x/threejs-skills/threejs-loaders` |

## Data, databases and queues

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| BullMQ | `bullmq` | Detect-only | — |
| Celery | `celery` | Mapped | `wshobson/agents/python-background-jobs` |
| ClickHouse | `clickhouse` | Mapped | `clickhouse/agent-skills/clickhouse-architecture-advisor` |
| Convex | `convex` | Mapped | `convex/agent-skills/convex` |
| Drizzle ORM | `drizzle` | Mapped | `bobmatnyc/claude-mpm-skills/drizzle` |
| DuckDB | `duckdb` | Detect-only | — |
| Firebase | `firebase` | Mapped | `firebase/agent-skills/firebase-auth-basics` |
| Inngest | `inngest` | Detect-only | — |
| InstantDB | `instantdb` | Mapped | `instantdb/skills/instantdb` |
| MongoDB | `mongodb` | Mapped | `hoodini/ai-agents-skills/mongodb` |
| MySQL / MariaDB clients | `mysql` | Mapped | `planetscale/database-skills/mysql` |
| Neon Postgres | `neon` | Mapped | `neondatabase/agent-skills/neon-postgres` |
| NumPy | `numpy` | Detect-only | — |
| Pandas | `pandas` | Mapped | `jeffallan/claude-skills/pandas-pro` |
| Polars | `polars` | Mapped | `yonesuke/skills/polars` |
| PostgreSQL (JS/Python) | `postgres` | Mapped | `github/awesome-copilot/postgresql-code-review`, `github/awesome-copilot/postgresql-optimization` |
| Prisma | `prisma` | Mapped | `prisma/skills/prisma-database-setup`, `prisma/skills/prisma-client-api`, `prisma/skills/prisma-cli`, `prisma/skills/prisma-postgres` |
| Pydantic | `pydantic` | Mapped | `bobmatnyc/claude-mpm-skills/pydantic` |
| Qdrant | `qdrant` | Mapped | `github/awesome-copilot/qdrant-clients-sdk`, `github/awesome-copilot/qdrant-deployment-options`, `github/awesome-copilot/qdrant-model-migration`, `github/awesome-copilot/qdrant-monitoring`, `github/awesome-copilot/qdrant-performance-optimization`, `github/awesome-copilot/qdrant-scaling`, `github/awesome-copilot/qdrant-search-quality`, `github/awesome-copilot/qdrant-version-upgrade` |
| Redis | `redis` | Mapped | `redis/agent-skills/redis-core` |
| Scikit-Learn | `scikit-learn` | Mapped | `davila7/claude-code-templates/scikit-learn`, `davila7/claude-code-templates/senior-data-scientist` |
| SQLAlchemy | `sqlalchemy` | Mapped | `bobmatnyc/claude-mpm-skills/sqlalchemy`, `wispbit-ai/skills/sqlalchemy-alembic-expert-best-practices-code-review` |
| SQLite | `sqlite` | Detect-only | — |
| Supabase | `supabase` | Mapped | `supabase/agent-skills/supabase-postgres-best-practices` |
| Temporal | `temporal` | Mapped | `temporalio/skill-temporal-developer/skill-temporal-developer` |
| Trigger.dev | `trigger-dev` | Mapped | `triggerdotdev/skills/trigger-setup` |
| Zod | `zod` | Mapped | `pproenca/dot-skills/zod` |

## Go ecosystem

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Cobra | `cobra` | Mapped | `samber/cc-skills-golang/golang-spf13-cobra` |
| Gin | `gin` | Detect-only | — |
| Go | `go` | Mapped | `samber/cc-skills-golang/golang-code-style`, `samber/cc-skills-golang/golang-error-handling`, `samber/cc-skills-golang/golang-security`, `samber/cc-skills-golang/golang-testing` |
| Go GraphQL | `go-graphql` | Mapped | `samber/cc-skills-golang/golang-graphql` |
| Go gRPC | `go-grpc` | Mapped | `samber/cc-skills-golang/golang-grpc` |
| Google Wire | `google-wire` | Mapped | `samber/cc-skills-golang/golang-google-wire` |
| samber/do | `samber-do` | Mapped | `samber/cc-skills-golang/golang-samber-do` |
| samber/hot | `samber-hot` | Mapped | `samber/cc-skills-golang/golang-samber-hot` |
| samber/lo | `samber-lo` | Mapped | `samber/cc-skills-golang/golang-samber-lo` |
| samber/mo | `samber-mo` | Mapped | `samber/cc-skills-golang/golang-samber-mo` |
| samber/oops | `samber-oops` | Mapped | `samber/cc-skills-golang/golang-samber-oops` |
| samber/ro | `samber-ro` | Mapped | `samber/cc-skills-golang/golang-samber-ro` |
| samber/slog | `samber-slog` | Mapped | `samber/cc-skills-golang/golang-samber-slog` |
| Swagger | `swagger` | Mapped | `samber/cc-skills-golang/golang-swagger` |
| Testify | `testify` | Mapped | `samber/cc-skills-golang/golang-stretchr-testify` |
| Uber Dig | `uber-dig` | Mapped | `samber/cc-skills-golang/golang-uber-dig` |
| Uber Fx | `uber-fx` | Mapped | `samber/cc-skills-golang/golang-uber-fx` |
| Viper | `viper` | Mapped | `samber/cc-skills-golang/golang-spf13-viper` |

## Languages, runtimes and scripting

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Bash | `bash` | Mapped | `wshobson/agents/bash-defensive-patterns` |
| Windows batch | `batch` | Mapped | `github/awesome-copilot/batch-files` |
| Bun | `bun` | Mapped | `midudev/autoskills/bun` |
| C++ | `cpp` | Mapped | `jeffallan/claude-skills/cpp-pro` |
| Deno | `deno` | Mapped | `denoland/skills/deno` |
| Elixir | `elixir` | Mapped | `georgeguimaraes/elixir-agent-tools/elixir` |
| Fish | `fish` | Detect-only | — |
| Haskell | `haskell` | Detect-only | — |
| Home Assistant | `home-assistant` | Detect-only | — |
| Jinja | `jinja` | Detect-only | — |
| Lua | `lua` | Detect-only | — |
| Nix | `nix` | Mapped | `devon-systems/hoenn/nix` |
| Node.js | `node` | Mapped | `wshobson/agents/nodejs-backend-patterns`, `sickn33/antigravity-awesome-skills/nodejs-best-practices` |
| PHP | `php` | Mapped | `jeffallan/claude-skills/php-pro` |
| PowerShell | `powershell` | Detect-only | — |
| Python | `python` | Mapped | `inferen-sh/skills/python-executor`, `wshobson/agents/python-testing-patterns`, `github/awesome-copilot/python-pypi-package-builder`, `Paldom/python-skills/python-ci`, `Paldom/python-skills/python-lint`, `Paldom/python-skills/python-packaging`, `Paldom/python-skills/python-precommit`, `Paldom/python-skills/python-release`, `Paldom/python-skills/python-supply-chain`, `Paldom/python-skills/python-testing`, `Paldom/python-skills/python-typing` |
| QML | `qml` | Detect-only | — |
| Ruby | `ruby` | Mapped | `lucianghinda/superpowers-ruby/ruby` |
| Rust | `rust` | Mapped | `apollographql/skills/rust-best-practices` |
| SuperCollider | `supercollider` | Detect-only | — |
| TypeScript | `typescript` | Mapped | `wshobson/agents/typescript-advanced-types` |
| Vala | `vala` | Detect-only | — |
| Zsh | `zsh` | Detect-only | — |

## Mobile, desktop and extensions

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Android | `android` | Mapped | `krutikJain/android-agent-skills/android-kotlin-core`, `krutikJain/android-agent-skills/android-compose-foundations`, `krutikJain/android-agent-skills/android-architecture-clean`, `krutikJain/android-agent-skills/android-di-hilt`, `krutikJain/android-agent-skills/android-gradle-build-logic`, `krutikJain/android-agent-skills/android-coroutines-flow`, `krutikJain/android-agent-skills/android-networking-retrofit-okhttp`, `krutikJain/android-agent-skills/android-testing-unit` |
| Capacitor | `capacitor` | Detect-only | — |
| Chrome Extension | `chrome-extension` | Mapped | `mindrally/skills/chrome-extension-development` |
| Dart | `dart` | Mapped | `kevmoo/dash_skills/dart-best-practices` |
| Electron | `electron` | Detect-only | — |
| Expo | `expo` | Mapped | `expo/skills/expo-native-ui`, `expo/skills/expo-data-fetching`, `expo/skills/expo-upgrade`, `expo/skills/expo-dev-client`, `expo/skills/eas-app-stores`, `expo/skills/eas-workflows`, `expo/skills/eas-hosting`, `expo/skills/expo-dom` |
| Flutter | `flutter` | Mapped | `jeffallan/claude-skills/flutter-expert`, `madteacher/mad-agents-skills/flutter-animations`, `madteacher/mad-agents-skills/flutter-testing` |
| Kotlin | `kotlin` | Mapped | `kotlin/kotlin-agent-skills/kotlin-tooling-java-to-kotlin` |
| Kotlin Multiplatform | `kotlin-multiplatform` | Mapped | `Kotlin/kotlin-agent-skills/kotlin-tooling-cocoapods-spm-migration`, `Kotlin/kotlin-agent-skills/kotlin-tooling-agp9-migration` |
| Obsidian | `obsidian` | Mapped | `laude-institute/headlong/obsidian` |
| React Native | `react-native` | Mapped | `sleekdotdesign/agent-skills/design-mobile-apps` |
| Swift | `swift` | Mapped | `avdlee/swift-concurrency-agent-skill/swift-concurrency` |
| SwiftUI | `swiftui` | Mapped | `avdlee/swiftui-agent-skill/swiftui-expert-skill`, `avdlee/swift-concurrency-agent-skill/swift-concurrency`, `avdlee/xcode-build-optimization-agent-skill/xcode-build-orchestrator`, `avdlee/swift-testing-agent-skill/swift-testing-expert`, `avdlee/core-data-agent-skill/core-data-expert` |
| Tauri | `tauri` | Mapped | `nodnarbnitram/claude-code-extensions/tauri-v2` |
| Userscripts | `userscripts` | Detect-only | — |

## Ruby on Rails ecosystem

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| ActiveAdmin | `activeadmin` | Detect-only | — |
| Devise | `devise` | Detect-only | — |
| PostgreSQL (Ruby) | `postgresql-ruby` | Detect-only | — |
| Ruby on Rails | `rails` | Mapped | `sergiodxa/agent-skills/ruby-on-rails-best-practices`, `lucianghinda/superpowers-ruby/rails-guides`, `igmarin/rails-agent-skills/apply-stack-conventions`, `igmarin/rails-agent-skills/review-migration`, `igmarin/rails-agent-skills/security-check`, `ombulabs/claude-code_rails-upgrade-skill/rails-upgrade` |
| Redis (Ruby) | `redis-ruby` | Mapped | `redis/agent-skills/redis-core` |
| Sidekiq | `sidekiq` | Mapped | `igmarin/rails-agent-skills/implement-background-job` |

## Testing and quality

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| AVA | `ava` | Detect-only | — |
| Biome | `biome` | Detect-only | — |
| commitlint | `commitlint` | Detect-only | — |
| Cypress | `cypress` | Mapped | `github/awesome-copilot/cypress-flake-fixer` |
| ESLint | `eslint` | Mapped | `claude-dev-suite/claude-dev-suite/typescript-eslint` |
| Husky | `husky` | Mapped | `mattpocock/skills/setup-pre-commit` |
| Jest | `jest` | Mapped | `github/awesome-copilot/javascript-typescript-jest` |
| Knip | `knip` | Mapped | `webpro/skills/configure-knip` |
| Lefthook | `lefthook` | Detect-only | — |
| lint-staged | `lint-staged` | Mapped | `mattpocock/skills/setup-pre-commit` |
| oxlint | `oxlint` | Mapped | `delexw/claude-code-misc/oxlint` |
| Playwright | `playwright` | Mapped | `currents-dev/playwright-best-practices-skill/playwright-best-practices` |
| pre-commit | `pre-commit` | Mapped | `Paldom/python-skills/python-precommit` |
| Prettier | `prettier` | Mapped | `thebushidocollective/han/prettier-configuration` |
| Pytest | `pytest` | Mapped | `wshobson/agents/python-testing-patterns`, `github/awesome-copilot/pytest-coverage`, `Paldom/python-skills/python-testing` |
| RSpec | `rspec` | Mapped | `igmarin/rails-agent-skills/test-service`, `lucianghinda/superpowers-ruby/test-driven-development` |
| RuboCop | `rubocop` | Detect-only | — |
| Ruff | `ruff` | Mapped | `github/awesome-copilot/ruff-recursive-fix`, `Paldom/python-skills/python-lint` |
| Sorbet | `sorbet` | Mapped | `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet`, `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet-inline` |
| Vitest | `vitest` | Mapped | `antfu/skills/vitest` |
| XO | `xo` | Detect-only | — |

## Web frameworks, UI and styling

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
| Angular | `angular` | Mapped | `angular/skills/angular-developer`, `angular/angular/reference-core`, `angular/angular/reference-signal-forms`, `angular/angular/reference-compiler-cli`, `angular/angular/adev-writing-guide` |
| Astro | `astro` | Mapped | `astrolicious/agent-skills/astro` |
| Chakra UI | `chakra-ui` | Detect-only | — |
| CodeMirror | `codemirror` | Detect-only | — |
| D3 | `d3` | Detect-only | — |
| Ink | `ink` | Detect-only | — |
| Lit | `lit` | Detect-only | — |
| Monaco Editor | `monaco-editor` | Detect-only | — |
| Mock Service Worker | `msw` | Mapped | `pymodel/react-frontend-skills/msw` |
| Next.js | `nextjs` | Mapped | `vercel/next.js/next-cache-components-adoption` |
| Nuxt | `nuxt` | Mapped | `antfu/skills/nuxt` |
| Pinia | `pinia` | Mapped | `vuejs-ai/skills/vue-pinia-best-practices` |
| Preact | `preact` | Mapped | `av/skills/preact-buildless-frontend` |
| Qwik | `qwik` | Detect-only | — |
| Radix UI | `radix-ui` | Mapped | `claude-dev-suite/claude-dev-suite/radix-ui` |
| React | `react` | Mapped | `vercel-labs/agent-skills/react-best-practices`, `vercel-labs/agent-skills/composition-patterns` |
| React Hook Form | `react-hook-form` | Mapped | `pproenca/dot-skills/react-hook-form` |
| React Router | `react-router` | Mapped | `remix-run/react-router/react-router` |
| Recharts | `recharts` | Mapped | `TerminalSkills/skills/recharts` |
| Redux | `redux` | Mapped | `davila7/claude-code-templates/react-state-management` |
| remark / rehype / unified | `remark-rehype-unified` | Detect-only | — |
| shadcn/ui | `shadcn` | Mapped | `shadcn/ui/shadcn` |
| SolidJS | `solidjs` | Detect-only | — |
| Storybook | `storybook` | Detect-only | — |
| Svelte | `svelte` | Mapped | `ejirocodes/agent-skills/svelte5-best-practices`, `sveltejs/ai-tools/svelte-code-writer` |
| SvelteKit | `sveltekit` | Mapped | `spences10/svelte-skills-kit/sveltekit-structure` |
| Tailwind CSS | `tailwind` | Mapped | `giuseppe-trisciuoglio/developer-kit/tailwind-css-patterns` |
| TanStack Form | `tanstack-form` | Detect-only | — |
| TanStack Query | `tanstack-query` | Mapped | `deckardger/tanstack-agent-skills/tanstack-query` |
| TanStack Start | `tanstack-start` | Mapped | `tanstack-skills/tanstack-skills/tanstack-start` |
| TanStack Table | `tanstack-table` | Mapped | `TerminalSkills/skills/tanstack-table` |
| tRPC | `trpc` | Detect-only | — |
| UnoCSS | `unocss` | Mapped | `antfu/skills/unocss` |
| Vue | `vue` | Mapped | `hyf0/vue-skills/vue-debug-guides`, `antfu/skills/vue`, `vuejs-ai/skills/vue-best-practices` |
| Zustand | `zustand` | Mapped | `Mindrally/skills/zustand-state-management` |

## Combinations

Requires are evaluated together using Nosey's normal scope policy.

| Name | ID | Requires | Skills |
| --- | --- | --- | --- |
| Android + Clerk | `android-clerk` | `android` + `clerk` | `clerk/skills/clerk-android`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Astro + Clerk | `astro-clerk` | `astro` + `clerk` | `clerk/skills/clerk-astro-patterns` |
| Chrome Extension + Clerk | `chrome-extension-clerk` | `chrome-extension` + `clerk` | `clerk/skills/clerk-chrome-extension-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Cloudflare + Vite | `cloudflare-vite` | `cloudflare` + `vite` | `cloudflare/vinext/migrate-to-vinext` |
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
| Next.js + Supabase | `nextjs-supabase` | `nextjs` + `supabase` | `supabase/agent-skills/supabase-postgres-best-practices` |
| Next.js + tRPC | `nextjs-trpc` | `nextjs` + `trpc` | `Mindrally/skills/trpc` |
| Next.js + Vercel AI SDK | `nextjs-vercel-ai` | `nextjs` + `vercel-ai` | `vercel/ai/use-ai-sdk` |
| Node.js + Express | `node-express` | `node` + `express` | `aj-geddes/useful-ai-prompts/nodejs-express-server` |
| Nuxt + Clerk | `nuxt-clerk` | `nuxt` + `clerk` | `clerk/skills/clerk-nuxt-patterns` |
| Ruby on Rails + RSpec | `rails-rspec` | `rails` + `rspec` | `igmarin/rails-agent-skills/plan-tests`, `igmarin/ruby-core-skills/triage-bug` |
| React + Clerk | `react-clerk` | `react` + `clerk` | `clerk/skills/clerk-react-patterns` |
| React Hook Form + Zod | `react-hook-form-zod` | `react-hook-form` + `zod` | `pproenca/dot-skills/zod` |
| React Native + Expo | `react-native-expo` | `react-native` + `expo` | `expo/skills/expo-native-ui`, `sleekdotdesign/agent-skills/design-mobile-apps` |
| React + React Three Fiber | `react-react-three-fiber` | `threejs` + `react` + `@react-three/fiber` | `vercel-labs/json-render/react-three-fiber` |
| React Router + Clerk | `react-router-clerk` | `react-router` + `clerk` | `clerk/skills/clerk-react-router-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| React + shadcn/ui | `react-shadcn` | `react` + `shadcn` | `shadcn/ui/shadcn`, `vercel-labs/agent-skills/react-best-practices` |
| React + TanStack Query | `react-tanstack-query` | `react` + `tanstack-query` | `Mindrally/skills/tanstack-query` |
| React + Zustand | `react-zustand` | `react` + `zustand` | `Mindrally/skills/zustand-state-management` |
| SwiftUI + Clerk | `swiftui-clerk` | `swiftui` + `clerk` | `clerk/skills/clerk-swift`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Tailwind CSS + shadcn/ui | `tailwind-shadcn` | `tailwind` + `shadcn` | `secondsky/claude-skills/tailwind-v4-shadcn` |
| TanStack Start + Clerk | `tanstack-clerk` | `tanstack-start` + `clerk` | `clerk/skills/clerk-tanstack-patterns`, `clerk/skills/clerk-setup`, `clerk/skills/clerk` |
| Terraform + Azure | `terraform-azure` | `terraform` + `azure` | `github/awesome-copilot/terraform-azurerm-set-diff-analyzer` |
| Vue + Clerk | `vue-clerk` | `vue` + `clerk` | `clerk/skills/clerk-vue-patterns` |

## Frontend essentials

`anthropics/skills/frontend-design`, `addyosmani/web-quality-skills/accessibility`, `addyosmani/web-quality-skills/seo`

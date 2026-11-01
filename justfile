# Justfile for scripts/evaluate-skills.mjs and the local Kev evaluation stack.
# `just --list` shows everything; run targets from the repository root.
#
# Environment overrides: KEV_DIR (kev checkout), KEV_RUN (serving checkpoint,
# must match KEV_CHECKPOINT in scripts/jev-evaluator.mjs), KEV_PORT, KEV_BASE_URL,
# KEV_OUTPUT (the kev results file).

set positional-arguments
set shell := ["bash", "-c"]

default:
    @just --list

# Start the local evaluation server (kev_dir/serve.log; returns immediately)
@kev-serve *args:
    cd {{env_var_or_default("KEV_DIR", "/home/bond/opt/kev")}} && nohup env KEV_CUDA_GRAPHS=0 \
        PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True \
        uv run --extra serve --no-dev python -m kev.serve \
        --run {{env_var_or_default("KEV_RUN", "jaredpalmer/kev-0.8b@v1.0")}} \
        --host 127.0.0.1 --port {{env_var_or_default("KEV_PORT", "8009")}} "$@" \
        > serve.log 2>&1 & echo "kev.serve pid $! (log: KEV_DIR/serve.log)"

# Serve log tail
@kev-logs lines='40':
    tail -n {{lines}} {{env_var_or_default("KEV_DIR", "/home/bond/opt/kev")}}/serve.log

# Stop the local server
@kev-stop:
    pkill -f 'kev.serve' || true

# Print serving provenance (checkpoint pin, device, dtype, truncation); waits until ready
@kev-health:
    for i in $(seq 1 90); do curl -fsS --max-time 5 {{env_var_or_default("KEV_BASE_URL", "http://127.0.0.1:" + env_var_or_default("KEV_PORT", "8009"))}}/v1/models 2>/dev/null \
        | python3 -c "import json,sys; c=json.load(sys.stdin)['models'][0]; print({k: c[k] for k in ('run','device','dtype','temperature','truncate_states')})" \
        && exit 0; sleep 3; done; exit 1

# Run the evaluator smoke test (base URL as argument to test another host)
@kev-smoke *args:
    if [ -n "${1:-}" ]; then node docker/kev/smoke-test.mjs "$@"; else node docker/kev/smoke-test.mjs; fi

# Evaluate catalog skills with local Kev (resumes cached results; extras like --limit 10)
@kev-eval *args:
    node scripts/evaluate-skills.mjs --provider jev --jev-endpoint kev \
        --output {{env_var_or_default("KEV_OUTPUT", "results/kev-0.8b-evaluations.json")}} "$@"

# Re-score every current catalog skill, ignoring the cache (--force)
@kev-eval-force *args:
    node scripts/evaluate-skills.mjs --provider jev --jev-endpoint kev --force \
        --output {{env_var_or_default("KEV_OUTPUT", "results/kev-0.8b-evaluations.json")}} "$@"

# Offline plan: no requests, credentials, or writes
@kev-plan *args:
    node scripts/evaluate-skills.mjs --provider jev --jev-endpoint kev --dry-run "$@"

# Check the saved Kev scores offline (fingerprints, means, distributions)
@kev-check:
    node scripts/evaluate-skills.mjs --check \
        --output {{env_var_or_default("KEV_OUTPUT", "results/kev-0.8b-evaluations.json")}}

# Check the canonical catalog scores
@check:
    node scripts/evaluate-skills.mjs --check --output data/scores.json

# Refresh canonical coverage offline (--sync), no API calls
@sync:
    node scripts/evaluate-skills.mjs --sync --output data/scores.json

# Validate all data files against their JSON Schemas
@validate:
    npm run validate:schemas -- --self-test

# Run the full test suite
@test:
    node --test tests/

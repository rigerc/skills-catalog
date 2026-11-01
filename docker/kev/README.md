# Kev-0.8B serving container

Runs [Kev](https://github.com/jaredpalmer/kev) 1.0 (Kev-0.8B) as a local
System One-compatible inference server for the skill evaluator. Kev is installed
from its GitHub source at a pinned release ref — never `pip install kev`, which
is an unrelated K.E.V. ORM package.

## Start

```sh
docker compose -f docker/kev/compose.yaml up -d --build
```

Requirements: Docker with the NVIDIA Container Toolkit and one CUDA GPU
(any 4 GB GPU or larger; the first start downloads the Kev-0.8B weights,
roughly 3 GB, into the persistent `kev-model-cache` volume). The server binds
to `127.0.0.1:8009` on the host only.

Verify, then smoke test:

```sh
curl -s http://127.0.0.1:8009/v1/models
node docker/kev/smoke-test.mjs
```

## Settings

Environment variables set on the host when starting Compose:

| Variable | Effect |
| --- | --- |
| `KEV_API_KEY` | If set, the server requires `Authorization: Bearer <key>`. The evaluator then needs the same value in `KEV_API_KEY`. |
| `KEV_DTYPE` | `fp32` serves the exact evaluation path; the default is bf16. |
| `KEV_GIT_REF` | Kev source ref baked into the image (default `kev-1.0`). |

Truncation is disabled (`KEV_TRUNCATE_STATES=0`), and the evaluator itself
rejects a server that reports truncation or a non-CUDA device, so env changes
there require image-side changes, not client-side workarounds.

## Files

- `Dockerfile` — Python 3.13 + uv, clones Kev at `KEV_GIT_REF`, installs the
  `serve` extra and flash-linear-attention.
- `compose.yaml` — GPU access, loopback port binding, persistent model cache,
  health check on `/v1/models`.
- `smoke-test.mjs` — sends one five-question score request and validates the
  typed answer shapes.

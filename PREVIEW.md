# Preview locally

From the repo root:

    mkdir -p _site/data && cp site/index.html _site/ && cp data/catalog.json data/mappings.json data/catalog-source-ledger.json data/quality.json _site/data/ && python3 -m http.server -d _site

Then open http://localhost:8000.

# Deploy

Unzip into the repo root, commit, and set Settings > Pages > Source to "GitHub Actions".
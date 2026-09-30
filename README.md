# Personal website

Coolify serves the `cdn` branch as a static website at https://tobyleons.xyz.

## STL viewer

`/stl/` loads up to two local ASCII or binary STL files (100 MB each). Files stay in the browser. Side-by-side display preserves scale and recenters the models; overlay display preserves the original coordinates. STL has no unit metadata: use the same export unit for both models.

Three.js 0.180.0 and its STLLoader / OrbitControls addons are vendored in `stl/vendor/`, with their MIT license. No external runtime CDN or package installation is required for deployment.

Run locally: `python3 -m http.server 8765`

Run checks: `node --test tests/*.test.mjs`

Deployment is triggered through Coolify after pushing `cdn`; this application has no push webhook. Previous version before the STL viewer: `e6cc92bce1ca2064da4fcf05faf014240f61c18e`.

Public Lekiwi models are published under `https://cdn.tobyleons.xyz/models/lekiwi/`. The viewer uses identical copies in `stl/models/` because the CDN has no Access-Control-Allow-Origin header and the available key cannot read bucket CORS settings (403). Download links point to the CDN.

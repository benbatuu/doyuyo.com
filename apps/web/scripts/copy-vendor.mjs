// MapLibre 6 runs its tile worker as a separate ES module that bundlers cannot inline.
// Serve the worker (and the shared chunk it imports) as static files from public/vendor/maplibre.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const out = new URL("../public/vendor/maplibre/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(dist, f), join(out, f));
console.log("maplibre worker copied");

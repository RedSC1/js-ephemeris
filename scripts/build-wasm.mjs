import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const core = process.argv[2];
if (!core)
  throw new Error("Usage: npm run build:wasm -- /path/to/taiyin-ephemeris");
const source = resolve(core, "experiments/wasm");
if (!existsSync(resolve(source, "web_bridge.cpp")))
  throw new Error("Core checkout must include the experimental Wasm bridge.");
const build = resolve(root, "build/cmake");
mkdirSync(build, { recursive: true });
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
}
run("emcmake", [
  "cmake",
  "-S",
  source,
  "-B",
  build,
  "-DCMAKE_BUILD_TYPE=Release",
  "-DTAIYIN_WEB_ENVIRONMENT=web,worker,node",
  "-DCMAKE_EXE_LINKER_FLAGS=-sEXPORT_ES6=1",
]);
run("cmake", ["--build", build, "--target", "taiyin_web", "--parallel", "10"]);
mkdirSync(resolve(root, "assets"), { recursive: true });
for (const [source, output] of [
  ["taiyin_web.js", "taiyin_web.mjs"],
  ["taiyin_web.wasm", "taiyin_web.wasm"],
])
  copyFileSync(resolve(build, source), resolve(root, "assets", output));
console.log(
  "Wasm assets built. No ephemeris data or native binary was bundled; nothing was published.",
);

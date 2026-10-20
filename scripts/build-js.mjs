import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { root, run, packageNames } from "./package-utils.mjs";
import { stagePackages } from "./stage-packages.mjs";

// Remove the previous single-package generated output too, so local examples
// cannot accidentally evaluate a stale second copy of the runtime.
rmSync(resolve(root, "dist"), { recursive: true, force: true });
for (const name of packageNames)
  rmSync(resolve(root, "packages", name, "dist"), {
    recursive: true,
    force: true,
  });
for (const config of [
  "tsconfig.json",
  "packages/js-bazi/tsconfig.json",
  "packages/js-ziwei/tsconfig.json",
])
  run(process.execPath, [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "-p",
    config,
  ]);
stagePackages();

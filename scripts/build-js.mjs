import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { root, run } from "./package-utils.mjs";

// Only generated output is removed: stale modules cannot leak into an archive.
rmSync(resolve(root, "dist"), { recursive: true, force: true });
run(process.execPath, [
  resolve(root, "node_modules/typescript/bin/tsc"),
  "-p",
  "tsconfig.json",
]);

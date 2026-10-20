import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { root, run, npm, packageNames } from "./package-utils.mjs";

run(process.execPath, [
  resolve(root, "scripts/build-package.mjs"),
  ...process.argv.slice(2),
]);
const destination = resolve(root, "build/packages");
mkdirSync(destination, { recursive: true });
for (const name of packageNames)
  npm(["pack", "--workspace", name, "--pack-destination", destination]);

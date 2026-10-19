import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { root, run, npm } from "./package-utils.mjs";

run(process.execPath, [
  resolve(root, "scripts/build-package.mjs"),
  ...process.argv.slice(2),
]);
const destination = resolve(root, "build/packages");
mkdirSync(destination, { recursive: true });
npm(["pack", "--pack-destination", destination]);

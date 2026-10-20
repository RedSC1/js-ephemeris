import { resolve } from "node:path";
import { verifyPackageInputs } from "./verify-package.mjs";
import { root, run } from "./package-utils.mjs";

verifyPackageInputs();
run(process.execPath, [resolve(root, "scripts/build-js.mjs")]);

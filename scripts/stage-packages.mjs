import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { root, corePackageRoot, packageNames } from "./package-utils.mjs";

/** Copies publish inputs only, never a second core runtime or Wasm. */
export function stagePackages() {
  for (const name of packageNames) {
    const destination = resolve(root, "packages", name);
    mkdirSync(destination, { recursive: true });
    for (const file of ["LICENSE", "NOTICE"])
      cpSync(resolve(root, file), resolve(destination, file));
  }
  for (const file of [
    "assets",
    "docs",
    "README.md",
    "README.zh-CN.md",
    "CHANGELOG.md",
    "CORE-NOTICE",
    "THIRD_PARTY_NOTICES.txt",
  ]) {
    const source = resolve(root, file);
    if (!existsSync(source)) continue;
    const destination = resolve(corePackageRoot, file);
    rmSync(destination, { recursive: true, force: true });
    cpSync(source, destination, { recursive: true });
  }
}

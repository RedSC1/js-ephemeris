import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./package-utils.mjs";
import {
  checkReadmeLinks,
  checkOnlineLinks,
  trackedRepositoryFiles,
} from "./readme-links.mjs";

const args = process.argv.slice(2);
if (args.length && (args.length !== 1 || args[0] !== "--online"))
  throw new Error("Usage: npm run test:links -- [--online]");

const trackedFiles = trackedRepositoryFiles(root);
const urls = [];
for (const directory of ["", "packages/js-bazi", "packages/js-ziwei"])
  for (const filename of ["README.md", "README.zh-CN.md"]) {
    const file = resolve(root, directory, filename);
    const links = checkReadmeLinks(
      readFileSync(file, "utf8"),
      trackedFiles,
      file,
    );
    if (!links.length) throw new Error(`No README links found in ${file}`);
    urls.push(...links);
    console.log(
      `[links] ${directory || "core"}/${filename}: PASS (${links.length} links)`,
    );
  }
if (args[0] === "--online")
  console.log(
    `[links] HTTP checks: PASS (${await checkOnlineLinks(urls)} unique URLs)`,
  );

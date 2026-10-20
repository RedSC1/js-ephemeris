import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { readFileSync, realpathSync } from "node:fs";
import * as E from "js-ephemeris";
import { exercisePackage } from "./scenario.mjs";

assert.ok(
  realpathSync(fileURLToPath(import.meta.resolve("js-ephemeris"))).startsWith(
    realpathSync(process.cwd()),
  ),
);
const info = JSON.parse(
  readFileSync(
    fileURLToPath(import.meta.resolve("js-ephemeris/assets/build-info.json")),
  ),
);
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.resolve("js-ephemeris"))),
);
assert.equal(info.packageVersion, pkg.version);
const node = await exercisePackage(E);
assert.equal(node.libraryVersion, info.pin.core.tag.slice(1));
const workers = await Promise.all(
  [0, 1].map(
    () =>
      new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL("./node-worker.mjs", import.meta.url),
        );
        let message;
        worker.once("message", (value) => {
          message = value;
        });
        worker.once("error", reject);
        worker.once("exit", (code) =>
          code === 0 && message
            ? resolve(message)
            : reject(new Error(`Node worker exited ${code}`)),
        );
      }),
  ),
);
workers.forEach((report) => assert.deepEqual(report, node));
console.log(JSON.stringify({ node, nodeWorkers: workers.length }));

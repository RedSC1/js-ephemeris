import * as E from "/pkg/dist/index.js";
import { exercisePackage } from "./scenario.mjs";

try {
  postMessage({ value: await exercisePackage(E) });
} catch (error) {
  postMessage({ error: error.stack ?? String(error) });
}

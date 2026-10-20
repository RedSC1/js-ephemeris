import { parentPort } from "node:worker_threads";
import * as Core from "js-ephemeris";
import * as Bazi from "js-bazi";
import * as Ziwei from "js-ziwei";
const E = { ...Core, ...Bazi, ...Ziwei };
import { exercisePackage } from "./scenario.mjs";

parentPort.postMessage(await exercisePackage(E));

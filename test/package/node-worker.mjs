import { parentPort } from "node:worker_threads";
import * as E from "js-ephemeris";
import { exercisePackage } from "./scenario.mjs";

parentPort.postMessage(await exercisePackage(E));

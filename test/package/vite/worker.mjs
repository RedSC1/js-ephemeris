import * as Core from "js-ephemeris";
import * as Bazi from "js-bazi";
import * as Ziwei from "js-ziwei";
const E = { ...Core, ...Bazi, ...Ziwei };
import { exercisePackage } from "./scenario.mjs";

try {
  postMessage({
    value: await exercisePackage(E, {
      wasmModuleUri: new URL(
        `${import.meta.env.BASE_URL}ephemeris/taiyin_web.mjs`,
        location.href,
      ),
    }),
  });
} catch (error) {
  postMessage({ error: error.stack ?? String(error) });
}

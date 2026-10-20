import * as E from "js-ephemeris";
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

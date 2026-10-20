import * as E from "js-ephemeris";
import { exercisePackage } from "./scenario.mjs";

try {
  const browser = await exercisePackage(E, {
    wasmModuleUri: new URL(
      `${import.meta.env.BASE_URL}ephemeris/taiyin_web.mjs`,
      location.href,
    ),
  });
  const worker = new Worker(new URL("./worker.mjs", import.meta.url), {
    type: "module",
  });
  const value = await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      worker.terminate();
      data.error ? reject(new Error(data.error)) : resolve(data.value);
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(error.message));
    };
  });
  globalThis.packageTestResult = { status: "PASS", browser, workers: [value] };
} catch (error) {
  globalThis.packageTestResult = {
    status: "FAIL",
    error: error.stack ?? String(error),
  };
}

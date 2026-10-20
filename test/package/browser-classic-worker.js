(async () => {
  try {
    const E = await import("/pkg/dist/index.js");
    const { exercisePackage } = await import("./scenario.mjs");
    postMessage({ value: await exercisePackage(E) });
  } catch (error) {
    postMessage({ error: error.stack ?? String(error) });
  }
})();

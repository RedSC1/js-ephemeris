// Loopback-only development server. Only the example/build/test assets are served.
import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const allowed = [
  "/examples/browser.html",
  "/test/scenarios.mjs",
  "/test/extended-scenarios.mjs",
  "/test/astronomy-scenarios.mjs",
  "/test/custom-model-scenarios.mjs",
  "/test/bazi-reverse-scenarios.mjs",
  "/test/fixtures/native-reference.json",
  "/dist/",
  "/assets/",
];
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const path =
      pathname === "/"
        ? "/examples/browser.html"
        : decodeURIComponent(pathname);
    if (
      !allowed.some((v) => (v.endsWith("/") ? path.startsWith(v) : path === v))
    )
      throw new Error("Not served");
    const absolute = await realpath(resolve(root, `.${path}`));
    if (!absolute.startsWith(root + sep)) throw new Error("Outside root");
    const data = await readFile(absolute);
    res.writeHead(200, {
      "content-type": types[extname(absolute)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(0, "127.0.0.1", () =>
  console.log(
    `http://127.0.0.1:${server.address().port}/examples/browser.html`,
  ),
);

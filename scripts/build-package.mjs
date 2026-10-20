import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { root, run, json, sha256 } from "./package-utils.mjs";
import {
  requiredPackageInputs,
  verifyPackageInputs,
} from "./verify-package.mjs";
import {
  prepareCoreArchive,
  prepareCoreBuild,
  refreshSdkNotices,
} from "./package-build-inputs.mjs";

const pin = json(resolve(root, "wasm-build.json"));
const pkg = json(resolve(root, "packages/js-ephemeris/package.json"));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--core-archive"))
  throw new Error(
    "Usage: npm run build:package -- [--core-archive /path/to/pinned-core.tar.gz]",
  );
const compiler = run("emcc", ["--version"], {
  encoding: "utf8",
  stdio: "pipe",
});
if (!compiler.split("\n")[0].includes(` ${pin.emscripten} (`))
  throw new Error(
    `Activate Emscripten ${pin.emscripten} before building this package.`,
  );
const sdk = run("em-config", ["EMSCRIPTEN_ROOT"], {
  encoding: "utf8",
  stdio: "pipe",
}).trim();
const stage = resolve(root, "build/package");
mkdirSync(stage, { recursive: true });
const archive = resolve(stage, "core.tar.gz");
await prepareCoreArchive({ core: pin.core, archive, providedArchive: args[1] });
const { source, build } = prepareCoreBuild(stage);
run("tar", ["-xzf", archive, "--strip-components=1", "-C", source]);
console.log(
  `[package] Building ${pin.core.tag} with Emscripten ${pin.emscripten}`,
);
run("emcmake", [
  "cmake",
  "-S",
  resolve(source, "experiments/wasm"),
  "-B",
  build,
  "-DCMAKE_BUILD_TYPE=Release",
  `-DTAIYIN_WEB_ENVIRONMENT=${pin.environments.join(",")}`,
  "-DCMAKE_EXE_LINKER_FLAGS=-sEXPORT_ES6=1",
  `-DCMAKE_CXX_FLAGS=-ffile-prefix-map=${source}=/taiyin`,
]);
run("cmake", ["--build", build, "--target", "taiyin_web", "--parallel", "10"]);
const assets = resolve(root, "assets");
rmSync(resolve(assets, "build-info.json"), { force: true });
refreshSdkNotices(sdk, assets);
copyFileSync(
  resolve(build, "taiyin_web.js"),
  resolve(assets, "taiyin_web.mjs"),
);
copyFileSync(
  resolve(build, "taiyin_web.wasm"),
  resolve(assets, "taiyin_web.wasm"),
);
copyFileSync(resolve(source, "NOTICE"), resolve(root, "CORE-NOTICE"));
const factory = (
  await import(pathToFileURL(resolve(assets, "taiyin_web.mjs")).href)
).default;
const module = await factory({ locateFile: (name) => resolve(assets, name) });
const protocol = Number(
  /astronomyProtocolId\s*=\s*(\d+)/.exec(
    readFileSync(
      resolve(root, "src/internal/astronomy-operations.generated.ts"),
      "utf8",
    ),
  )?.[1],
);
if (
  module._taiyin_get_c_abi_version() !== 11 ||
  module._taiyin_web_bridge_version() !== 1 ||
  module._taiyin_web_astronomy_version() !== protocol ||
  module.UTF8ToString(module._taiyin_get_library_version()) !==
    pin.core.tag.slice(1)
)
  throw new Error("Built Wasm does not match the JS protocol/core version");
const info = {
  format: 1,
  packageName: pkg.name,
  packageVersion: pkg.version,
  pin,
  astronomyProtocolId: protocol,
  files: Object.fromEntries(
    requiredPackageInputs.map((file) => [
      file,
      {
        sha256: sha256(resolve(root, file)),
        bytes: statSync(resolve(root, file)).size,
      },
    ]),
  ),
};
writeFileSync(
  resolve(assets, "build-info.json"),
  JSON.stringify(info, null, 2) + "\n",
);
verifyPackageInputs();
run(process.execPath, [resolve(root, "scripts/build-js.mjs")]);
console.log(
  "[package] Verified ESM loader, Wasm, declarations and notices. Nothing published.",
);

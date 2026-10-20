import { existsSync, readFileSync } from "node:fs";
import { resolve, posix } from "node:path";
import { root, json, sha256, validateCorePin } from "./package-utils.mjs";

export const sdkNotices = {
  "EMSCRIPTEN-LICENSE.txt": "LICENSE",
  "EMSCRIPTEN-AUTHORS.txt": "AUTHORS",
  "MUSL-COPYRIGHT.txt": "system/lib/libc/musl/COPYRIGHT",
  "LIBCXX-LICENSE.txt": "system/lib/libcxx/LICENSE.TXT",
  "LIBCXXABI-LICENSE.txt": "system/lib/libcxxabi/LICENSE.TXT",
  "COMPILER-RT-LICENSE.txt": "system/lib/compiler-rt/LICENSE.TXT",
};
export const requiredPackageInputs = [
  "assets/taiyin_web.mjs",
  "assets/taiyin_web.wasm",
  "assets/package.json",
  "LICENSE",
  "NOTICE",
  "CORE-NOTICE",
  "THIRD_PARTY_NOTICES.txt",
  ...Object.keys(sdkNotices).map((name) => `assets/licenses/${name}`),
];
export function verifyPackageInputs(directory = root) {
  const pkg = json(resolve(directory, "package.json"));
  const pin = json(resolve(directory, "wasm-build.json"));
  validateCorePin(pin.core);
  const manifest = resolve(directory, "assets/build-info.json");
  if (!existsSync(manifest))
    throw new Error(
      "Missing verified Wasm assets. Run npm run build:package first.",
    );
  const info = json(manifest);
  const protocol = Number(
    /astronomyProtocolId\s*=\s*(\d+)/.exec(
      readFileSync(
        resolve(directory, "src/internal/astronomy-operations.generated.ts"),
        "utf8",
      ),
    )?.[1],
  );
  if (
    info.format !== 1 ||
    info.packageName !== pkg.name ||
    info.packageVersion !== pkg.version ||
    !Number.isSafeInteger(protocol) ||
    info.astronomyProtocolId !== protocol ||
    JSON.stringify(info.pin) !== JSON.stringify(pin)
  )
    throw new Error(
      "Stale Wasm build metadata. Run npm run build:package again.",
    );
  for (const file of requiredPackageInputs) {
    const entry = info.files?.[file];
    if (
      !entry ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") ||
      !existsSync(resolve(directory, file)) ||
      sha256(resolve(directory, file)) !== entry.sha256
    )
      throw new Error(
        `Missing or mismatched package input: ${file}. Rebuild with npm run build:package.`,
      );
  }
  for (const file of Object.keys(info.files ?? {}))
    if (
      posix.normalize(file) !== file ||
      file.startsWith("/") ||
      file.startsWith("../") ||
      file.includes("\\")
    )
      throw new Error("Invalid build metadata path");
  return info;
}

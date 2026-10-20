import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256, validateCorePin } from "./package-utils.mjs";
import { sdkNotices } from "./verify-package.mjs";

export async function prepareCoreArchive({
  core,
  archive,
  providedArchive,
  fetchArchive = fetch,
}) {
  validateCorePin(core);
  if (providedArchive !== undefined) {
    const supplied = resolve(providedArchive);
    if (sha256(supplied) !== core.archiveSha256)
      throw new Error("Core archive SHA-256 mismatch");
    if (supplied !== resolve(archive)) copyFileSync(supplied, archive);
  } else if (!existsSync(archive) || sha256(archive) !== core.archiveSha256) {
    console.log(`[package] Downloading ${core.tag} (${core.revision})`);
    const response = await fetchArchive(core.archiveUrl, {
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok) throw new Error(`Core download: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== core.archiveSha256)
      throw new Error("Core archive SHA-256 mismatch");
    // A failed HTTP/checksum verification must not replace a cached archive.
    await writeFile(archive, bytes);
  }
  if (sha256(archive) !== core.archiveSha256)
    throw new Error("Core archive SHA-256 mismatch");
}

export function prepareCoreBuild(stage) {
  const source = resolve(stage, "core");
  const build = resolve(stage, "wasm");
  // Only these generated directories are reset; verified downloads are retained.
  for (const directory of [source, build]) {
    rmSync(directory, { recursive: true, force: true });
    mkdirSync(directory, { recursive: true });
  }
  return { source, build };
}

export function refreshSdkNotices(sdk, assets) {
  const licenses = resolve(assets, "licenses");
  rmSync(licenses, { recursive: true, force: true });
  mkdirSync(licenses, { recursive: true });
  for (const [name, file] of Object.entries(sdkNotices))
    copyFileSync(resolve(sdk, file), resolve(licenses, name));
}

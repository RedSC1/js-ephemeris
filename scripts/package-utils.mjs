import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const json = (file) => JSON.parse(readFileSync(file, "utf8"));
export const sha256 = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} exited with ${result.status}\n${result.stderr ?? ""}`,
    );
  return result.stdout;
}
export function npm(args, options = {}) {
  if (!process.env.npm_execpath)
    throw new Error("Run this script through npm run.");
  return run(process.execPath, [process.env.npm_execpath, ...args], options);
}

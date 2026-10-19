// Mechanical bridge schema generation: no astronomical algorithm is generated.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const core = process.argv[2];
if (!core) throw new Error("Pass the C++ core checkout");
const files = [
  "include/taiyin/c/base.h",
  "include/taiyin/c/eclipse.h",
  "include/taiyin/c/chinese_calendar.h",
  "include/taiyin/c/chinese_calendar_ganzhi.h",
  "bazi_astrology/include/taiyin/c/bazi.h",
  "ziwei_astrology/include/taiyin/c/ziwei.h",
];
let headers = "";
for (const file of files) {
  try {
    headers += readFileSync(resolve(core, file), "utf8") + "\n";
  } catch {}
}
headers = headers.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const types = new Map();
for (const m of headers.matchAll(
  /typedef struct (\w+)\s*\{([^}]+)\}\s*\w+\s*;/g,
)) {
  const fields = new Map();
  for (const statement of m[2].split(";")) {
    const f = /^\s*(\w+)\s+([\s\S]+)$/.exec(statement);
    if (f)
      for (const declarator of f[2].split(",")) {
        const name = /^\s*(\w+)/.exec(declarator)?.[1];
        if (name) fields.set(name, f[1]);
      }
  }
  types.set(m[1], fields);
}
const schema = {};
const names = new Map();
const pascal = (s) =>
  s
    .replace(/^taiyin_/, "")
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("")
    .replace(/Ut$/, "Ut1");
const camel = (s) =>
  s
    .replace(/jd_ut\b/g, "julian_date_ut1")
    .replace(/jd_tt\b/g, "julian_date_tt")
    .replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
for (const file of [
  "eclipse_bridge.inc",
  "bazi_bridge.inc",
  "ziwei_bridge.inc",
]) {
  const source = readFileSync(resolve(core, "experiments/wasm", file), "utf8");
  for (const match of source.matchAll(
    /void eclipse_pack\(const (\w+)& v,\s*std::vector<double>& out\)\s*\{([^}]+)\}/g,
  )) {
    const [_, name, body] = match;
    const fields = [];
    for (const line of body.trim().split("\n")) {
      const field = /v\.(\w+)/.exec(line)?.[1];
      if (!field) throw new Error(`Unrecognized pack: ${name}: ${line}`);
      const type = types.get(name)?.get(field);
      if (!type) throw new Error(`Missing field type ${name}.${field}`);
      const shape = [...line.matchAll(/;\s*i\w*\s*<\s*(\d+)/g)].map((m) =>
        Number(m[1]),
      );
      fields.push({ key: camel(field), type, shape });
    }
    schema[name] = fields;
    names.set(name, pascal(name));
  }
}
const scale = (key) =>
  /utc/i.test(key)
    ? "UTC"
    : /Ut1/.test(key)
      ? "UT1"
      : /Tt/.test(key)
        ? "TT"
        : null;
let output =
  '// Generated from the version-1 C++ field-wise Wasm bridge. Do not hand-edit.\nimport type {JulianDate,AstroDateTime} from "../date.js";\n';
for (const [name, fields] of Object.entries(schema)) {
  if (
    name === "taiyin_split_julian_date" ||
    name === "taiyin_calendar_datetime"
  )
    continue;
  output += `export interface ${names.get(name)} {\n`;
  for (const f of fields) {
    let type =
      f.type === "taiyin_split_julian_date"
        ? `JulianDate${scale(f.key) ? `<'${scale(f.key)}'>` : ""} | null`
        : f.type === "taiyin_calendar_datetime"
          ? "AstroDateTime"
          : (names.get(f.type) ?? "number");
    for (const _ of f.shape) type = `readonly (${type})[]`;
    output += ` readonly ${f.key}: ${type};\n`;
  }
  output += "}\n";
}
output +=
  "export const recordSchemas = " +
  JSON.stringify(schema, null, 2) +
  " as const;\n";
writeFileSync(
  new URL("../src/internal/records.generated.ts", import.meta.url),
  output,
);
console.log(`Generated ${Object.keys(schema).length} record schemas`);

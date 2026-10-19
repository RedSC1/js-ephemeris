import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const core = process.argv[2];
if (!core) throw new Error("Pass the C++ core checkout");
const source = readFileSync(
  resolve(core, "experiments/wasm/eclipse_bridge.inc"),
  "utf8",
);
const cases = [
  ...source.matchAll(
    /case (\d+): \{ \/\/ (\w+)\n([\s\S]+?)(?=case \d+:|\n\}\ndiagnostic)/g,
  ),
];
if (cases.length !== 39)
  throw new Error("Expected bridge v1: 39 eclipse operations");
const methodNames = [
  "solveLunarAtTt",
  "solveLunarAtUt1",
  "nextLunarAtTt",
  "nextLunarAtUt1",
  "lunarEclipsesAtTt",
  "lunarEclipsesAtUt1",
  "localLunarVisibilityAtTt",
  "localLunarVisibilityAtUt1",
  "nextLocalLunarAtTt",
  "nextLocalLunarAtUt1",
  "solveSolarAtTt",
  "solveSolarAtUt1",
  "nextSolarAtTt",
  "nextSolarAtUt1",
  "solarEclipsesAtTt",
  "solarEclipsesAtUt1",
  "solveLocalSolarAtTt",
  "solveLocalSolarAtUt1",
  "nextLocalSolarAtTt",
  "nextLocalSolarAtUt1",
  "localSolarCircumstancesAtTt",
  "localSolarCircumstancesAtUt1",
  "solarBesselianElementsAtTt",
  "solarBesselianPolynomialAtTt",
  "evaluateSolarBesselianPolynomial",
  "solarEclipseRouteRowAtTt",
  "solarEclipseRouteRowAtUt1",
  "solarEclipseWhereAtTt",
  "solarEclipseWhereAtUt1",
  "solarEclipseRouteAtTt",
  "solarEclipseRouteAtUt1",
  "solarEclipseRouteCurvesAtTt",
  "solarEclipseRouteCurvesAtUt1",
  "solarEclipseRouteProductAtTt",
  "solarEclipseRouteProductAtUt1",
  "solarEclipseRouteMapProductAtTt",
  "solarEclipseRouteMapProductAtUt1",
  "localSolarEclipseBoundaryAtTt",
  "localSolarEclipseBoundaryAtUt1",
];
const pascal = (s) =>
  s
    .replace(/^taiyin_/, "")
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("")
    .replace(/Ut$/, "Ut1");
let out = `// Generated transport facade for the existing C++ eclipse API; no algorithms here.
import {JulianDate,jdValues,sameScale,type TtJulianDate,type Ut1JulianDate} from './date.js';
import {finite,integer,positionMask,result,ResultFlags,type PositionFlags,type OperationResult} from './models.js';
import type {ContextHost} from './internal/wasm.js';
import {encode,decode,width,uint64} from './internal/records.js';
import type * as R from './internal/records.generated.js';
export interface EclipseOptions {positionFlags?:PositionFlags;options?:bigint|number;kinds?:number;maxResults?:number;maxRows?:number;routeSampleCount?:number}
export enum EclipseKind {none=0,penumbral=1,partial=2,total=4,annular=8,hybrid=16,central=32,noncentral=64}
export const EclipseOption=Object.freeze({includeContacts:1n<<33n,excludePenumbral:1n<<34n,backward:1n<<35n,localRefraction:1n<<37n,lunarLimbCorrection:1n<<38n,localStrictMeteorology:1n<<32n});
const flags=(o:EclipseOptions)=>{const [low,high]=uint64(o.options??0);return uint64(BigInt(positionMask(o.positionFlags))|BigInt(low!)|(BigInt(high!)<<32n));};
function jd(value:JulianDate,scale:'TT'|'UT1'):number[]{sameScale(value,scale);return jdValues(value);}
export interface SolarEclipseRouteProduct {readonly summary:R.SolarEclipseRouteProductSummary;readonly points:readonly R.SolarEclipseRouteProductPoint[]}
export class EclipseApi {
 constructor(private readonly host:ContextHost){}
 private call(op:number,input:number[]):number[]{return this.host.run(()=>{const reply=this.host.wire.structured('_taiyin_web_eclipse',[this.host.handle,op],input);this.host.record(reply.values);return this.host.wire.checked(reply,0);});}
 private one<T>(op:number,input:number[],name:string):OperationResult<T>{const v=this.call(op,input);return result(decode<T>(name,v),new ResultFlags(v[0]!));}
 private many<T>(op:number,input:number[],name:string):OperationResult<readonly T[]>{const v=this.call(op,input);return result(Object.freeze(Array.from({length:integer(v[2]!,0,1000000,'record count')},(_,i)=>decode<T>(name,v,32+i*width(name)))),new ResultFlags(v[0]!));}
 private product(op:number,input:number[]):OperationResult<SolarEclipseRouteProduct>{const v=this.call(op,input);const name='taiyin_solar_eclipse_route_product_summary';return result(Object.freeze({summary:decode<R.SolarEclipseRouteProductSummary>(name,v),points:Object.freeze(Array.from({length:integer(v[2]!,0,1000000,'point count')},(_,i)=>decode<R.SolarEclipseRouteProductPoint>('taiyin_solar_eclipse_route_product_point',v,32+width(name)+i*width('taiyin_solar_eclipse_route_product_point'))))}),new ResultFlags(v[0]!));}
`;
for (const m of cases) {
  const id = Number(m[1]),
    name = methodNames[id],
    body = m[3],
    scale = name.endsWith("Ut1") ? "UT1" : "TT",
    jdType = scale === "TT" ? "TtJulianDate" : "Ut1JulianDate";
  const record =
    /std::vector<(\w+)> output/.exec(body)?.[1] ??
    /\n(taiyin_\w+) output;/.exec(body)?.[1];
  if (!record) throw new Error(`No record for ${name}`);
  const array = /std::vector</.test(body),
    product = id >= 33 && id <= 36;
  let params = [],
    input = [];
  if ([6, 7].includes(id)) {
    const type = /(?:^|\n)(taiyin_\w+) arg1;/.exec(body)[1];
    params = [`eclipse:R.${pascal(type)}`, "options:EclipseOptions={}"];
    input = [`...encode('${type}',eclipse,'${scale}')`, "...flags(options)"];
  } else if (id === 24) {
    params = [
      "polynomial:R.SolarBesselianPolynomial",
      "timeOffsetHours:number",
    ];
    input = [
      `...encode('taiyin_solar_besselian_polynomial',polynomial)`,
      "finite(timeOffsetHours,'time offset')",
    ];
  } else {
    params = [`coordinate:${jdType}`];
    input = [`...jd(coordinate,'${scale}')`];
    if ([4, 5, 14, 15, 29, 30].includes(id)) {
      params = [`start:${jdType}`, `end:${jdType}`];
      input = [`...jd(start,'${scale}')`, `...jd(end,'${scale}')`];
    }
    if ([2, 3, 4, 5, 8, 9, 12, 13, 14, 15, 18, 19].includes(id)) {
      params.push("options:EclipseOptions={}");
      input.push(
        `integer(options.kinds??0,0,0xffffffff,'eclipse kinds')`,
        "...flags(options)",
      );
    } else if (id === 22) {
      params.push("timeOffsetHours=0");
      input.push(`finite(timeOffsetHours,'time offset')`);
    } else if (id === 23) {
      params.push(
        "options:{spanHours:number;sampleStepHours:number;degree?:number}",
      );
      input.push(
        `finite(options.spanHours,'span hours')`,
        `finite(options.sampleStepHours,'sample step hours')`,
        `integer(options.degree??4,1,7,'degree')`,
      );
    } else if ([20, 21].includes(id)) {
    } else if ([29, 30].includes(id)) {
      params.push("options:EclipseOptions & {stepMinutes:number}");
      input.push(
        `finite(options.stepMinutes,'step minutes')`,
        "...flags(options)",
      );
    } else if (id >= 37) {
      params.push("options:{longitudeDegrees:number;latitudeDegrees:number}");
      input.push(
        `finite(options.longitudeDegrees,'longitude')`,
        `finite(options.latitudeDegrees,'latitude')`,
      );
    } else {
      params.push("options:EclipseOptions={}");
      input.push("...flags(options)");
    }
    if (id >= 31 && id <= 36)
      input.push(
        `integer(options.routeSampleCount??400,32,4096,'route sample count')`,
      );
  }
  if (array)
    input.push(
      id >= 31
        ? "0"
        : id >= 29
          ? `integer(options.maxRows??256,1,1000000,'maximum rows')`
          : `integer(options.maxResults??16,1,1000000,'maximum results')`,
    );
  const type = product
    ? "SolarEclipseRouteProduct"
    : array
      ? `readonly R.${pascal(record)}[]`
      : `R.${pascal(record)}`;
  const fn = product
    ? "product"
    : array
      ? `many<R.${pascal(record)}>`
      : `one<R.${pascal(record)}>`;
  out += ` /** C++ ${m[2]}. */\n ${name}(${params.join(",")}):OperationResult<${type}>{return this.${fn}(${id},[${input.join(",")}]${product ? "" : `, '${record}'`});}\n`;
}
out += "}\n";
writeFileSync(new URL("../src/eclipse.ts", import.meta.url), out);
console.log("Generated all 39 eclipse operations");

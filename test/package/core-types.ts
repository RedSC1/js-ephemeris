// Compiled separately: optional package augmentation must not leak into core.
import { Ephemeris } from "js-ephemeris";
const eph = await Ephemeris.initialize();
const ctx = eph.createContext();
ctx.chineseCalendar;
// @ts-expect-error Install and import js-bazi before using this extension.
ctx.bazi();
// @ts-expect-error Install and import js-ziwei before using this extension.
ctx.ziwei();
// @ts-expect-error Shen Sha catalogs belong to js-bazi.
eph.createBaziShenShaCatalog();
// @ts-expect-error Ziwei catalogs belong to js-ziwei.
eph.createZiweiDataCatalog();
eph.close();

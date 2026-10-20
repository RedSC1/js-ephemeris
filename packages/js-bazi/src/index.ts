import {
  Ephemeris,
  EphemerisContext,
  type ChineseCalendar,
} from "js-ephemeris";
import {
  contextExtensionHost,
  runtimeExtensionHost,
} from "js-ephemeris/extension-host";
import { BaziContext, createBazi, type BaziConfiguration } from "./bazi.js";
import { createShenShaCatalog, type BaziShenShaCatalog } from "./shen-sha.js";
export { BaziContext, BaziGender, BaziClockMode } from "./bazi.js";
export type {
  BaziConfiguration,
  BaziCalculation,
  BaziClock,
  BaziCalculateOptions,
  BaziReverseOptions,
  BaziCivilOptions,
  BaziRelationResult,
} from "./bazi.js";
export {
  BaziShenShaCatalog,
  BaziShenShaContext,
  BaziShenShaTargetKind,
} from "./shen-sha.js";
export type {
  BaziShenShaRule,
  BaziShenShaModule,
  BaziShenShaInput,
  BaziShenShaMatch,
} from "./shen-sha.js";
export type {
  BaziContextConfig,
  BaziChart,
  BaziRelation,
  BaziQiyunResult,
  BaziDayun,
  BaziXiaoyun,
  BaziRenyuanSilingSegment,
  BaziRenyuanSilingResult,
  BaziReverseCandidate,
} from "js-ephemeris/extension-host";

export type BaziContextOptions = BaziConfiguration & {
  chineseCalendar?: ChineseCalendar;
};
declare module "js-ephemeris" {
  interface EphemerisContext {
    /** Creates an extension bound to this context and its selected calendar. */
    bazi(options?: BaziContextOptions): BaziContext;
  }
  interface Ephemeris {
    createBaziShenShaCatalog(): BaziShenShaCatalog;
  }
}
Object.defineProperty(EphemerisContext.prototype, "bazi", {
  configurable: false,
  writable: false,
  value: function (
    this: EphemerisContext,
    options: BaziContextOptions = {},
  ): BaziContext {
    const access = contextExtensionHost(this);
    return access.createChild((onClose) => {
      const { chineseCalendar = access.calendar(), ...config } = options;
      return createBazi(
        access.host,
        access.time,
        chineseCalendar,
        config,
        onClose,
      );
    });
  },
});
Object.defineProperty(Ephemeris.prototype, "createBaziShenShaCatalog", {
  configurable: false,
  writable: false,
  value: function () {
    return createShenShaCatalog(runtimeExtensionHost(this));
  },
});

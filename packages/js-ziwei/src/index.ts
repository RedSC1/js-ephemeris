import {
  Ephemeris,
  EphemerisContext,
  type ChineseCalendar,
} from "js-ephemeris";
import {
  contextExtensionHost,
  runtimeExtensionHost,
} from "js-ephemeris/extension-host";
import { ZiweiContext, createZiwei, type ZiweiConfiguration } from "./ziwei.js";
import {
  createZiweiDataCatalog,
  type ZiweiDataCatalog,
  type ZiweiCatalogOptions,
} from "./ziwei-catalog.js";
export { ZiweiDataCatalog, ZiweiRuleset } from "./ziwei-catalog.js";
export type { ZiweiCatalogOptions } from "./ziwei-catalog.js";
export {
  ZiweiContext,
  ZiweiChart,
  ZiweiCastingChart,
  ZiweiGender,
  ZiweiClockMode,
  ZiweiChartMode,
  ZiweiFlowLevel,
  ZiweiPillarBoundary,
  ZiweiLeapMonthStrategy,
  ZiweiFlowMonthPalaceStrategy,
  ZiweiBureau,
  ZiweiPalace,
} from "./ziwei.js";
export type {
  ZiweiClock,
  ZiweiOptionSelection,
  ZiweiJsonRuleModule,
  ZiweiConfiguration,
  ZiweiStar,
  ZiweiStarPosition,
  ZiweiChartSummary,
  ZiweiClockTarget,
  ZiweiBirthConfiguration,
  ZiweiFlowConfiguration,
  ZiweiReverseUt1Candidate,
  ZiweiUtcClockTarget,
  ZiweiCalculateOptions,
  ZiweiCivilOptions,
} from "./ziwei.js";

export type {
  ZiweiChartClock,
  ZiweiPlacementInput,
  ZiweiPlacementPatch,
  ZiweiCastingOptions,
  ZiweiCastingSummary,
  ZiweiOmittedPlacement,
  ZiweiBirthOptions,
  ZiweiFlowOptions,
  ZiweiTransformSet,
  ZiweiFlowSummary,
  ZiweiReverseQuery,
  ZiweiReverseRequest,
  ZiweiReverseCandidate,
} from "js-ephemeris/extension-host";

export type ZiweiContextOptions = ZiweiConfiguration & {
  chineseCalendar?: ChineseCalendar;
};
declare module "js-ephemeris" {
  interface EphemerisContext {
    /** Creates an extension bound to this context and its selected calendar. */
    ziwei(options?: ZiweiContextOptions): ZiweiContext;
  }
  interface Ephemeris {
    createZiweiDataCatalog(options?: ZiweiCatalogOptions): ZiweiDataCatalog;
  }
}
Object.defineProperty(EphemerisContext.prototype, "ziwei", {
  configurable: false,
  writable: false,
  value: function (
    this: EphemerisContext,
    options: ZiweiContextOptions = {},
  ): ZiweiContext {
    const access = contextExtensionHost(this);
    return access.createChild((onClose) => {
      const { chineseCalendar = access.calendar(), ...config } = options;
      return createZiwei(
        access.host,
        access.time,
        chineseCalendar,
        config,
        onClose,
      );
    });
  },
});
Object.defineProperty(Ephemeris.prototype, "createZiweiDataCatalog", {
  configurable: false,
  writable: false,
  value: function (options = {}) {
    return createZiweiDataCatalog(runtimeExtensionHost(this), options);
  },
});

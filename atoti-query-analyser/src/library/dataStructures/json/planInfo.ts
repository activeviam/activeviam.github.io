import {
  multiFieldValidate,
  optional,
  validateBoolean,
  validateInt,
  validateObject,
  validateObjectAsMap,
  validateString,
} from "./validatingUtils";

export interface PlanInfo {
  pivotType: string;
  pivotId: string;
  epoch: string;
  branch: string;
  retrieverType: string;
  mdxPass?: string;
  clusterMemberId?: string;
  contextValues: Map<string, string>;
  isContinuous: boolean;
  rangeSharing: number;
  missedPrefetchBehavior: string;
  aggregatesCache: string;
  globalTimings: Map<string, number>;
  isEmpty: boolean;
}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link PlanInfo}.
 */
export function validatePlanInfo(rawPlanInfo: any): PlanInfo {
  validateObject(rawPlanInfo);
  if (Object.keys(rawPlanInfo).length === 1 && "mdxPass" in rawPlanInfo) {
    return {
      pivotType: "",
      pivotId: "",
      aggregatesCache: "",
      branch: "",
      contextValues: new Map(),
      epoch: "",
      globalTimings: new Map(),
      isContinuous: false,
      isEmpty: true,
      mdxPass: rawPlanInfo.mdxPass,
      missedPrefetchBehavior: "",
      rangeSharing: 0,
      retrieverType: "",
    };
  }

  return {
    aggregatesCache: validateString(rawPlanInfo.aggregatesCache),
    branch: validateString(rawPlanInfo.branch),
    clusterMemberId: optional(rawPlanInfo.clusterMemberId, validateString),
    contextValues: validateObjectAsMap(
      rawPlanInfo.contextValues,
      validateString,
      validateString
    ),
    epoch: validateString(rawPlanInfo.epoch),
    globalTimings: validateObjectAsMap(
      rawPlanInfo.globalTimings,
      validateString,
      validateInt
    ),
    isContinuous: multiFieldValidate(
      validateBoolean,
      rawPlanInfo.isContinuous,
      rawPlanInfo.continuous
    ),
    isEmpty: false,
    mdxPass: optional(rawPlanInfo.mdxPass, validateString),
    missedPrefetchBehavior: validateString(rawPlanInfo.missedPrefetchBehavior),
    pivotId: validateString(rawPlanInfo.pivotId),
    pivotType: validateString(rawPlanInfo.pivotType),
    rangeSharing: validateInt(rawPlanInfo.rangeSharing),
    retrieverType: validateString(rawPlanInfo.retrieverType),
  };
}

import {
  AggregateRetrieval,
  ExternalRetrieval,
  validateAggregateRetrieval,
  validateExternalRetrieval,
} from "./retrieval";
import { DependencyMap, validateDependencyMap } from "./dependencyMap";
import { optional, validateBoolean, validateList } from "./validatingUtils";
import { PlanInfo, validatePlanInfo } from "./planInfo";
import { Filter, validateFilter } from "./filter";
import { QuerySummary, validateQuerySummary } from "./querySummary";

interface JsonQueryPlanOldFormat {
  planInfo: PlanInfo;
  retrievals: AggregateRetrieval[];
  dependencies: DependencyMap;
  queryFilters: Filter[];
  querySummary: QuerySummary;
  needFillTimingInfo?: boolean;
}

interface JsonQueryPlanModernFormat {
  planInfo: PlanInfo;
  aggregateRetrievals: AggregateRetrieval[];
  dependencies: DependencyMap;
  externalRetrievals: ExternalRetrieval[];
  externalDependencies: DependencyMap;
  queryFilters: Filter[];
  querySummary: QuerySummary;
  needFillTimingInfo?: boolean;
}

function validateJsonQueryPlanOldFormat(
  rawQueryPlan: any
): JsonQueryPlanOldFormat {
  if (typeof rawQueryPlan !== "object" || rawQueryPlan === null) {
    throw new Error("queryPlan is not an object");
  }
  const planInfo = validatePlanInfo(rawQueryPlan.planInfo);
  const retrievals = validateList(
    rawQueryPlan.retrievals,
    validateAggregateRetrieval
  );
  const dependencies = validateDependencyMap(rawQueryPlan.dependencies);
  const queryFilters = validateList(rawQueryPlan.queryFilters, validateFilter);
  const querySummary = validateQuerySummary(rawQueryPlan.querySummary);
  const needFillTimingInfo = optional(
    rawQueryPlan.needFillTimingInfo,
    validateBoolean
  );
  return {
    planInfo,
    retrievals,
    dependencies,
    queryFilters,
    querySummary,
    needFillTimingInfo,
  };
}

function validateJsonQueryPlanModernFormat(
  rawQueryPlan: any
): JsonQueryPlanModernFormat {
  if (typeof rawQueryPlan !== "object" || rawQueryPlan === null) {
    throw new Error("queryPlan is not an object");
  }
  const planInfo = validatePlanInfo(rawQueryPlan.planInfo);
  const aggregateRetrievals = validateList(
    rawQueryPlan.aggregateRetrievals || rawQueryPlan.retrievals,
    validateAggregateRetrieval
  );
  const dependencies = validateDependencyMap(rawQueryPlan.dependencies);
  const externalRetrievals = validateList(
    rawQueryPlan.externalRetrievals,
    validateExternalRetrieval
  );
  const externalDependencies = validateDependencyMap(
    rawQueryPlan.externalDependencies
  );
  const queryFilters = validateList(rawQueryPlan.queryFilters, validateFilter);
  const querySummary = validateQuerySummary(rawQueryPlan.querySummary);
  const needFillTimingInfo = optional(
    rawQueryPlan.needFillTimingInfo,
    validateBoolean
  );
  return {
    planInfo,
    aggregateRetrievals,
    dependencies,
    externalRetrievals,
    externalDependencies,
    queryFilters,
    querySummary,
    needFillTimingInfo,
  };
}

function convertToV2(plan: JsonQueryPlanOldFormat): JsonQueryPlanModernFormat {
  const {
    planInfo,
    retrievals,
    dependencies,
    queryFilters,
    querySummary,
    needFillTimingInfo,
  } = plan;
  return {
    planInfo,
    aggregateRetrievals: retrievals,
    dependencies,
    externalRetrievals: [],
    externalDependencies: new Map(),
    queryFilters,
    querySummary,
    needFillTimingInfo,
  };
}

export type JsonQueryPlan = JsonQueryPlanModernFormat;

export function validateJsonQueryPlan(rawQueryPlan: any): JsonQueryPlan {
  try {
    return validateJsonQueryPlanModernFormat(rawQueryPlan);
  } catch (errV2) {
    try {
      return convertToV2(validateJsonQueryPlanOldFormat(rawQueryPlan));
    } catch (errV1) {
      console.log(errV2);
      console.log(errV1);
      throw new Error("Failed to validate query plan", {
        cause: { errV2, errV1 },
      });
    }
  }
}

import { Measure, validateMeasure } from "./measure";
import {
  validateInt,
  validateListAsSet,
  validateObject,
  validateObjectAsMap,
  validateString,
} from "./validatingUtils";

export interface QuerySummary {
  measures: Set<Measure>;
  totalRetrievals: number;
  retrievalsCountByType: Map<string, number>;
  partitioningCountByType: Map<string, number>;
  resultSizeByPartitioning: Map<string, number>;
  partialProviders: Set<string>;
  totalExternalResultSize: number;
}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link QuerySummary}.
 */
export function validateQuerySummary(rawQuerySummary: any): QuerySummary {
  if (rawQuerySummary === undefined) {
    return {
      measures: new Set(),
      partialProviders: new Set(),
      partitioningCountByType: new Map(),
      resultSizeByPartitioning: new Map(),
      retrievalsCountByType: new Map(),
      totalExternalResultSize: 0,
      totalRetrievals: 0,
    };
  }

  validateObject(rawQuerySummary);

  return {
    measures: validateListAsSet(rawQuerySummary.measures, validateMeasure),
    partialProviders: validateListAsSet(
      rawQuerySummary.partialProviders || [],
      validateString
    ),
    partitioningCountByType: validateObjectAsMap(
      rawQuerySummary.partitioningCountByType,
      validateString,
      validateInt
    ),
    resultSizeByPartitioning: validateObjectAsMap(
      rawQuerySummary.resultSizeByPartitioning || {},
      validateString,
      validateInt
    ),
    retrievalsCountByType: validateObjectAsMap(
      rawQuerySummary.retrievalsCountByType,
      validateString,
      validateInt
    ),
    totalExternalResultSize: validateInt(
      rawQuerySummary.totalExternalResultSize || 0
    ),
    totalRetrievals: validateInt(rawQuerySummary.totalRetrievals),
  };
}

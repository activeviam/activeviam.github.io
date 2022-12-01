import { Measure, validateMeasure } from "./measure";
import {
  validateInt,
  validateListAsSet,
  validateObject,
  validateObjectAsMap,
  validateString
} from "./validatingUtils";

export interface QuerySummary {
  measures: Set<Measure>,
  totalRetrievals: number,
  retrievalsCountByType: Map<string, number>,
  partitioningCountByType: Map<string, number>,
  resultSizeByPartitioning: Map<string, number>,
  partialProviders: Set<string>,
  totalExternalResultSize: number,
}

export function validateQuerySummary(rawQuerySummary: any): QuerySummary {
  validateObject(rawQuerySummary);

  return {
    measures: validateListAsSet(rawQuerySummary.measures, validateMeasure),
    partialProviders: validateListAsSet(rawQuerySummary.partialProviders || [], validateString),
    partitioningCountByType: validateObjectAsMap(rawQuerySummary.partitioningCountByType, validateString, validateInt),
    resultSizeByPartitioning: validateObjectAsMap(rawQuerySummary.resultSizeByPartitioning, validateString, validateInt),
    retrievalsCountByType: validateObjectAsMap(rawQuerySummary.retrievalsCountByType, validateString, validateInt),
    totalExternalResultSize: validateInt(rawQuerySummary.totalExternalResultSize),
    totalRetrievals: validateInt(rawQuerySummary.totalRetrievals)
  };
}
import {
  AdjacencyListGraph,
  AGraphObserver,
  Edge,
  Vertex,
} from "../common/graph";
import {
  multiFieldValidate,
  validateInt,
  validateList,
  validateObject,
  validateString,
} from "./validatingUtils";
import { CubeLocation, validateLocation } from "./cubeLocation";
import { Measure, validateMeasure } from "./measure";
import { TimingInfo, validateTimingInfo } from "./timingInfo";

export const VirtualRetrievalKind = "VirtualRetrieval" as const;
export const AggregateRetrievalKind = "AggregateRetrieval" as const;
export const ExternalRetrievalKind = "ExternalRetrieval" as const;

type TVirtualRetrievalKind = typeof VirtualRetrievalKind;
type TAggregateRetrievalKind = typeof AggregateRetrievalKind;
type TExternalRetrievalKind = typeof ExternalRetrievalKind;

type RetrievalKind =
  | TVirtualRetrievalKind
  | TExternalRetrievalKind
  | TAggregateRetrievalKind;

export interface ARetrieval {
  $kind: RetrievalKind;
  type: string;
  retrievalId: number;
  timingInfo: TimingInfo;
}

export type VirtualRetrieval = ARetrieval & {
  $kind: TVirtualRetrievalKind;
};

export type AggregateRetrieval = ARetrieval & {
  $kind: TAggregateRetrievalKind;
  partialProviderName: string;
  partitioning: string;
  location: CubeLocation[];
  measures: Measure[];
  filterId: number;
  measureProvider: string;
  underlyingDataNodes: string[];
  resultSizes: number[];
  childrenIds?: number[];
};

export type ExternalRetrieval = ARetrieval & {
  $kind: TExternalRetrievalKind;
  store: string;
  fields: string[];
  joinedMeasure: Measure[];
  condition: string;
  resultSizes: number[];
};

export class RetrievalVertex extends Vertex<ARetrieval> {}

export class RetrievalEdge extends Edge<
  ARetrieval,
  undefined,
  RetrievalVertex
> {}

export class RetrievalGraph extends AdjacencyListGraph<ARetrieval, undefined> {}

export class ARetrievalGraphObserver extends AGraphObserver<
  ARetrieval,
  undefined,
  RetrievalVertex,
  RetrievalEdge,
  RetrievalGraph
> {}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link AggregateRetrieval}.
 */
export function validateAggregateRetrieval(
  rawRetrieval: any
): AggregateRetrieval {
  validateObject(rawRetrieval);

  return {
    $kind: AggregateRetrievalKind,
    filterId: validateInt(rawRetrieval.filterId),
    location: validateList(rawRetrieval.location, validateLocation),
    measureProvider: validateString(rawRetrieval.measureProvider || "N/A"),
    measures: validateList(rawRetrieval.measures, validateMeasure),
    partialProviderName: validateString(
      rawRetrieval.partialProviderName || "N/A"
    ),
    partitioning: validateString(rawRetrieval.partitioning),
    resultSizes: validateList(rawRetrieval.resultSizes || [], validateInt),
    retrievalId: multiFieldValidate(
      validateInt,
      rawRetrieval.retrievalId,
      rawRetrieval.retrId
    ),
    timingInfo: validateTimingInfo(rawRetrieval.timingInfo),
    type: validateString(rawRetrieval.type),
    underlyingDataNodes: validateList(
      rawRetrieval.underlyingDataNodes,
      validateString
    ),
  };
}

/**
 * Deep validation of JSON parse result, expected to be {@link ExternalRetrieval}.
 */
export function validateExternalRetrieval(
  rawRetrieval: any
): ExternalRetrieval {
  validateObject(rawRetrieval);

  return {
    $kind: ExternalRetrievalKind,
    condition: validateString(rawRetrieval.condition),
    fields: validateList(rawRetrieval.fields, validateString),
    joinedMeasure: validateList(rawRetrieval.joinedMeasure, validateMeasure),
    resultSizes: validateList(rawRetrieval.resultSizes, validateInt),
    retrievalId: multiFieldValidate(
      validateInt,
      rawRetrieval.retrievalId,
      rawRetrieval.retrId
    ),
    store: validateString(rawRetrieval.store),
    timingInfo: validateTimingInfo(rawRetrieval.timingInfo),
    type: validateString(rawRetrieval.type || "ExternalDatabaseRetrieval"),
  };
}

import { AdjacencyListGraph, AGraphObserver, Edge, Vertex } from "../common/graph";
import { multiFieldValidate, validateInt, validateList, validateObject, validateString } from "./validatingUtils";
import { CubeLocation, validateLocation } from "./cubeLocation";
import { Measure, validateMeasure } from "./measure";
import { TimingInfo, validateTimingInfo } from "./timingInfo";

export const VirtualRetrievalKind: "VirtualRetrieval" = "VirtualRetrieval";
export const AggregateRetrievalKind: "AggregateRetrieval" = "AggregateRetrieval";
export const ExternalRetrievalKind: "ExternalRetrieval" = "ExternalRetrieval";

export type VirtualRetrievalKind = typeof VirtualRetrievalKind;
export type AggregateRetrievalKind = typeof AggregateRetrievalKind;
export type ExternalRetrievalKind = typeof ExternalRetrievalKind;

export type RetrievalKind =
  | VirtualRetrievalKind
  | ExternalRetrievalKind
  | AggregateRetrievalKind;

export interface ARetrieval {
  $kind: RetrievalKind,
  retrievalId: number,
  timingInfo: TimingInfo,
}

export type VirtualRetrieval = ARetrieval & {
  $kind: VirtualRetrievalKind,
};

export type AggregateRetrieval = ARetrieval & {
  $kind: AggregateRetrievalKind,
  partialProviderName: string,
  type: string,
  partitioning: string,
  location: CubeLocation[],
  measures: Measure[],
  filterId: number,
  measureProvider: string,
  underlyingDataNodes: string[],
  resultSizes: number[],
};

export type ExternalRetrieval = ARetrieval & {
  $kind: ExternalRetrievalKind,
  type: string,
  store: string,
  fields: string[],
  joinedMeasure: Measure[],
  condition: string,
  resultSizes: number[],
};

export class RetrievalVertex extends Vertex<ARetrieval> {
}

export class RetrievalEdge extends Edge<ARetrieval, undefined, RetrievalVertex> {
}

export class RetrievalGraph extends AdjacencyListGraph<ARetrieval, undefined> {
}

export class ARetrievalGraphObserver extends AGraphObserver<ARetrieval, undefined, RetrievalVertex, RetrievalEdge, RetrievalGraph> {
}

export function validateAggregateRetrieval(rawRetrieval: any): AggregateRetrieval {
  validateObject(rawRetrieval);

  return {
    $kind: AggregateRetrievalKind,
    filterId: validateInt(rawRetrieval.filterId),
    location: validateList(rawRetrieval.location, validateLocation),
    measureProvider: validateString(rawRetrieval.measureProvider || "N/A"),
    measures: validateList(rawRetrieval.measures, validateMeasure),
    partialProviderName: validateString(rawRetrieval.partialProviderName),
    partitioning: validateString(rawRetrieval.partitioning),
    resultSizes: validateList(rawRetrieval.resultSizes, validateInt),
    retrievalId: multiFieldValidate(validateInt, rawRetrieval.retrievalId, rawRetrieval.retrId),
    timingInfo: validateTimingInfo(rawRetrieval.timingInfo),
    type: validateString(rawRetrieval.type),
    underlyingDataNodes: validateList(rawRetrieval.underlyingDataNodes, validateString)
  };
}

export function validateExternalRetrieval(rawRetrieval: any): ExternalRetrieval {
  validateObject(rawRetrieval);

  return {
    $kind: ExternalRetrievalKind,
    condition: validateString(rawRetrieval.condition),
    fields: validateList(rawRetrieval.fields, validateString),
    joinedMeasure: validateList(rawRetrieval.joinedMeasure, validateMeasure),
    resultSizes: validateList(rawRetrieval.resultSizes, validateInt),
    retrievalId: multiFieldValidate(validateInt, rawRetrieval.retrievalId, rawRetrieval.retrId),
    store: validateString(rawRetrieval.store),
    timingInfo: validateTimingInfo(rawRetrieval.timingInfo),
    type: validateString(rawRetrieval.type || "ExternalDatabaseRetrieval")
  };
}
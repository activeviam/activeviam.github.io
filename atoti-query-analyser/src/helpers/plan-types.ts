export type TimingInfo = {
  startTime: number[],
  elapsedTime: number[]
}

export type Location = {
  dimension: string,
  hierarchy: string,
  level: string[],
  path: string[]
}

export type Retrieval = {
  retrId: number,
  type: string,
  location: Location,
  measures: string[],
  timingInfo?: TimingInfo,
  partitioning: string,
  filterId: number,
  measureProvider: string,
  underlyingDataNodes: string[]
}

export type QueryFilter = {
  id: number,
  description: string
}

export type PlanInfo = any;

export type QuerySummary = any;

export type Plan = {
  planInfo: PlanInfo,
  dependencies: {[key: string]: number[]},
  queryFilters: QueryFilter[],
  retrievals: Retrieval[],
  querySummary: QuerySummary
}
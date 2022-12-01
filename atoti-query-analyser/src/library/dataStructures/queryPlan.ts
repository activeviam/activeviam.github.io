import { RetrievalGraph } from "./json/retrieval";
import { PlanInfo } from "./json/planInfo";
import { Filter } from "./json/filter";
import { QuerySummary } from "./json/querySummary";
import { validateJsonQueryPlan } from "./json/jsonQueryPlan";
import buildGraph from "../graphProcessors/buildGraph";
import { setSimulatedTimingInfo } from "../graphProcessors/fillTimingInfo";

export interface QueryPlan {
  planInfo: PlanInfo,
  graph: RetrievalGraph
  queryFilters: Filter[],
  querySummary: QuerySummary,
}

export function preprocessQueryPlan(json: any): QueryPlan[] {
  if (!Array.isArray(json)) {
    throw new Error("data must be an array");
  }

  return json
    .map(validateJsonQueryPlan)
    .map(({
            planInfo,
            querySummary,
            queryFilters,
            dependencies,
            externalRetrievals,
            externalDependencies,
            aggregateRetrievals,
            needFillTimingInfo
          }) => {

      const graph = buildGraph(aggregateRetrievals, externalRetrievals, dependencies, externalDependencies);
      if (needFillTimingInfo) {
        setSimulatedTimingInfo(graph);
      }

      return {
        planInfo,
        querySummary,
        queryFilters,
        graph
      };
    });
}
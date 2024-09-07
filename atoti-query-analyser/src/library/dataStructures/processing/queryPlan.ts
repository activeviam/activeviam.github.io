import { RetrievalGraph } from "../json/retrieval";
import { PlanInfo } from "../json/planInfo";
import { Filter } from "../json/filter";
import { QuerySummary } from "../json/querySummary";
import { validateJsonQueryPlan } from "../json/jsonQueryPlan";
import { buildGraph } from "../../graphProcessors/buildGraph";
import { setSimulatedTimingInfo } from "../../graphProcessors/fillTimingInfo";

export interface QueryPlan {
  planInfo: PlanInfo;
  graph: RetrievalGraph;
  queryFilters: Filter[];
  querySummary: QuerySummary;
}

const preprocessResultSize = (graph: RetrievalGraph) => {
  for (const node of graph.getVertices()) {
    const retrieval = node.getMetadata();
    const resultSizes = Reflect.get(retrieval, "resultSizes");
    const elapsedTimes = retrieval.timingInfo.elapsedTime;
    if (
      resultSizes &&
      Array.isArray(resultSizes) &&
      elapsedTimes !== undefined
    ) {
      if (resultSizes.length < elapsedTimes.length) {
        // Try to fill the missing result sizes by setting a size of 0 for operations of duration 0.
        // They are likely to not have return any result, causing this very short duration
        // we will only do this if the count of operations of duration 0 matches the count of missing sizes
        const zeroOperationCount = elapsedTimes.filter(
          (time) => time === 0
        ).length;
        if (zeroOperationCount === elapsedTimes.length - resultSizes.length) {
          let sizePosition = 0;
          const processedResultSizes = elapsedTimes.map((time) =>
            time === 0 ? 0 : resultSizes[sizePosition++]
          );
          Reflect.set(retrieval, "resultSizes", processedResultSizes);
        }
      }
    }
  }
};

/**
 * Given an output of `JSON.parse()`, convert it into
 * {@link "library/dataStructures/json/jsonQueryPlan"!JsonQueryPlan}, and then
 * build retrieval graph and return {@link QueryPlan}.
 */
export function preprocessQueryPlan(json: unknown): QueryPlan[] {
  if (!Array.isArray(json)) {
    throw new Error("data must be an array");
  }

  return json
    .map(validateJsonQueryPlan)
    .map(
      ({
        planInfo,
        querySummary,
        queryFilters,
        dependencies,
        externalRetrievals,
        externalDependencies,
        aggregateRetrievals,
        needFillTimingInfo,
      }) => {
        const graph = buildGraph(
          aggregateRetrievals,
          externalRetrievals,
          dependencies,
          externalDependencies
        );
        if (needFillTimingInfo) {
          setSimulatedTimingInfo(graph);
        }
        preprocessResultSize(graph);

        return {
          planInfo,
          querySummary,
          queryFilters,
          graph,
        };
      }
    );
}

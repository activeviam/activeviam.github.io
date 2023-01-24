import _ from "lodash";
import { filterAndInverse } from "./filterAndInverse";
import { multiDfs } from "../dataStructures/common/graph";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
  ARetrievalGraphObserver,
  ExternalRetrieval,
  ExternalRetrievalKind,
  RetrievalGraph,
  RetrievalVertex,
  VirtualRetrievalKind,
} from "../dataStructures/json/retrieval";
import { QueryPlan } from "../dataStructures/processing/queryPlan";
import { Measure } from "../dataStructures/json/measure";
import { VertexSelection } from "../dataStructures/processing/selection";

function removeNoOps(queries: QueryPlan[]) {
  return queries.map((query) => {
    const { graph } = query;

    return new Set(
      Array.from(graph.getVertices())
        .filter((vertex) => {
          const timingInfo = vertex.getMetadata().timingInfo;
          return (
            timingInfo &&
            Object.entries(timingInfo).filter(
              ([, value]) => value !== undefined
            ).length !== 0
          );
        })
        .map((vertex) => vertex.getUUID())
    );
  });
}

function addVirtualVertices(query: QueryPlan, selection: VertexSelection) {
  selection.add(query.graph.getVertexByLabel("virtualSource").getUUID());
  selection.add(query.graph.getVertexByLabel("virtualTarget").getUUID());
}

// Remove nodes without timing info
/**
 * For each query plan, build default vertex selection, which includes all
 * retrievals except for no-ops.
 */
export function buildDefaultSelection(queries: QueryPlan[]) {
  const selections = removeNoOps(queries);

  queries.forEach((query, idx) => {
    addVirtualVertices(query, selections[idx]);
  });
  return selections;
}

/**
 * Given an array of measures, build a subselection of graph vertices. A vertex
 * included into the resulting selection either if the corresponding retrieval
 * has at least one of the specified measures, or if one of its
 * successors/predecessors does so.
 */
export function filterByMeasures({
  graph,
  measures,
  selection,
}: {
  graph: RetrievalGraph;
  measures: Measure[];
  selection: VertexSelection;
}) {
  const { filteredGraph, invGraph, virtualSource, virtualTarget } =
    filterAndInverse(graph, selection);

  const predicate = (vertex: RetrievalVertex) => {
    const kind = vertex.getMetadata().$kind;

    switch (kind) {
      case VirtualRetrievalKind:
        return false;
      case AggregateRetrievalKind:
        return (
          _.intersection(
            measures,
            (vertex.getMetadata() as AggregateRetrieval).measures
          ).length > 0
        );
      case ExternalRetrievalKind:
        return (
          _.intersection(
            measures,
            (vertex.getMetadata() as ExternalRetrieval).joinedMeasure
          ).length > 0
        );
      default:
        throw new Error(`Unsupported retrieval kind: ${kind}`);
    }
  };

  const selectedVertices = Array.from(filteredGraph.getVertices()).filter(
    predicate
  );

  class VertexCollector extends ARetrievalGraphObserver {
    collectedVertices = new Set<RetrievalVertex>();

    onVertexDiscover(vertex: RetrievalVertex) {
      this.collectedVertices.add(vertex);
    }
  }

  const vertexCollector = new VertexCollector();
  multiDfs(filteredGraph, selectedVertices, vertexCollector);
  multiDfs(invGraph, selectedVertices, vertexCollector);

  vertexCollector.collectedVertices.add(virtualSource);
  vertexCollector.collectedVertices.add(virtualTarget);

  return new Set(
    Array.from(vertexCollector.collectedVertices).map((vertex) =>
      vertex.getUUID()
    )
  );
}

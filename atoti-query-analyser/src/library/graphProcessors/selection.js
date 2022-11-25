import _ from "lodash";
import { filterAndInverse } from "./filterAndInverse";
import { AGraphObserver, multiDfs } from "../dataStructures/graph";

const removeNoOps = queries => {
  return queries.map(query => {
    const { graph } = query;

    return new Set(
      [...graph.getVertices()]
        .filter((vertex) => {
          console.log(vertex);
          const timingInfo = vertex.getMetadata().get("timingInfo");
          return timingInfo && Object.entries(timingInfo).length > 0;
        })
        .map((vertex) => vertex.getUUID())
    );
  });
};

const addVirtualVertices = (query, selection) => {
  selection.add(query.graph.getVertexByLabel("virtualSource").getUUID());
  selection.add(query.graph.getVertexByLabel("virtualTarget").getUUID());
};

// Remove nodes without timing info
const applySelection = (queries, type) => {
  const selections = removeNoOps(queries);

  _.zip(queries, selections).forEach(([query, selection]) => addVirtualVertices(query, selection));
  return selections;
};

const filterByMeasures = ({
                            graph,
                            measures,
                            selection
                          }) => {
  const { filteredGraph, invGraph, virtualSource, virtualTarget } = filterAndInverse(graph, selection);

  const predicate = (vertex) => {
    const kind = vertex.getMetadata().get("$kind");

    switch (kind) {
      case "Virtual":
        return false;
      case "Retrieval":
        return _.intersection(measures, vertex.getMetadata().get("measures")).length > 0;
      case "ExternalRetrieval":
        return _.intersection(measures, vertex.getMetadata().get("joinedMeasure")).length > 0;
      default:
        throw new Error(`Unsupported retrieval kind: ${kind}`);
    }
  }

  const selectedVertices = [...filteredGraph.getVertices()].filter(predicate);

  class VertexCollector extends AGraphObserver {
    collectedVertices = new Set();

    onVertexDiscover(vertex) {
      this.collectedVertices.add(vertex);
    }
  }

  const vertexCollector = new VertexCollector();
  multiDfs(filteredGraph, selectedVertices, vertexCollector);
  multiDfs(invGraph, selectedVertices, vertexCollector);

  vertexCollector.collectedVertices.add(virtualSource);
  vertexCollector.collectedVertices.add(virtualTarget);

  return new Set([...vertexCollector.collectedVertices].map((vertex) => vertex.getUUID()));
};

export {
  applySelection,
  filterByMeasures
};

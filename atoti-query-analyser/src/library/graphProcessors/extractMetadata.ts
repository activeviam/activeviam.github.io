import { QueryPlan } from "../dataStructures/processing/queryPlan";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
} from "../dataStructures/json/retrieval";
import { computeIfAbsent, requireNonNull } from "../utilities/util";
import PropTypes from "prop-types";

export interface QueryPlanMetadata {
  passType: string;
  pass: number;
  name?: string;
  id: number;
  parentId: number | null;
  // Timing fields from globalTimings
  contextTime?: number;
  preparationTime?: number;
  planningTime?: number;
  executionTime?: number;
}

export const QueryPlanMetadataPropType = PropTypes.shape({
  passType: PropTypes.string.isRequired,
  pass: PropTypes.number.isRequired,
  name: PropTypes.string,
  id: PropTypes.number.isRequired,
  parentId: PropTypes.number,
  contextTime: PropTypes.number,
  preparationTime: PropTypes.number,
  planningTime: PropTypes.number,
  executionTime: PropTypes.number,
});

/**
 * For each query, finds list of subqueries and save it to `res[i].childrenIds`.
 * Then, for each query sets its parent id.
 * */
function findChildrenAndParents(
  res: QueryPlanMetadata[],
  queries: QueryPlan[],
) {
  const resIndexByName = new Map(
    res.map((queryInfo) => [queryInfo.name, queryInfo]),
  );

  queries.forEach((query, queryId) => {
    const { graph } = query;
    graph.getVertices().forEach((vertex) => {
      if (vertex.getMetadata().$kind !== AggregateRetrievalKind) {
        return;
      }

      const metadata = vertex.getMetadata() as AggregateRetrieval;
      const underlyingDataNodes = metadata.underlyingDataNodes;

      metadata.childrenIds = underlyingDataNodes.map(
        (name) => requireNonNull(resIndexByName.get(name)).id,
      );

      // give its children their parentId
      underlyingDataNodes.forEach((name) => {
        requireNonNull(resIndexByName.get(name)).parentId = queryId;
      });
    });
  });
}

/**
 * Builds the label for a query node in the DOT output.
 * Format:
 *   QueryName
 *   (PassType)
 *   ---
 *   Context: X ms
 *   Preparation: X ms
 *   ...
 */
function buildNodeLabel(queryMetadata: QueryPlanMetadata): string {
  const labelParts: string[] = [];

  // Node name at top
  if (queryMetadata.name) {
    labelParts.push(queryMetadata.name);
  }

  // Pass type in parentheses
  labelParts.push(`(${queryMetadata.passType}Pass)`);

  // Add timings section if any exist
  const timings: string[] = [];
  if (queryMetadata.contextTime !== undefined) {
    timings.push(`Context: ${queryMetadata.contextTime} ms`);
  }
  if (queryMetadata.preparationTime !== undefined) {
    timings.push(`Preparation: ${queryMetadata.preparationTime} ms`);
  }
  if (queryMetadata.planningTime !== undefined) {
    timings.push(`Planning: ${queryMetadata.planningTime} ms`);
  }
  if (queryMetadata.executionTime !== undefined) {
    timings.push(`Execution: ${queryMetadata.executionTime} ms`);
  }

  if (timings.length > 0) {
    labelParts.push("---");
    labelParts.push(...timings);
  }

  return labelParts.join("\n");
}

/**
 * Exports queries metadata info in DOT format
 * */
export function dumpMetadata(metadata: QueryPlanMetadata[]) {
  const queriesByPass = new Map<number, Set<number>>();
  metadata.forEach((query) => {
    computeIfAbsent(queriesByPass, query.pass, () => new Set()).add(query.id);
  });

  const lines: string[] = [];
  lines.push("digraph PassInfo {");
  lines.push(
    'fontname="Helvetica,Arial,sans-serif"\n' +
      '\tnode [fontname="Helvetica,Arial,sans-serif",shape=box]\n' +
      '\tedge [fontname="Helvetica,Arial,sans-serif"]',
  );

  queriesByPass.forEach((queries, pass) => {
    lines.push(`subgraph cluster_pass_${pass} {`);
    lines.push("style=filled");
    lines.push("label=" + JSON.stringify(`Pass ${pass}`));
    lines.push("color=lightgrey");

    Array.from(queries).forEach((queryId) => {
      const queryMetadata = metadata[queryId];
      const label = buildNodeLabel(queryMetadata);
      lines.push(`q${queryId} [label=${JSON.stringify(label)}]`);
      if (queryMetadata.parentId !== null) {
        lines.push(`q${queryMetadata.parentId} -> q${queryId}`);
      }
    });

    lines.push(`}`);
  });

  lines.push("}");
  return lines.join("\n");
}

/**
 * Helper to get timing value from globalTimings Map,
 * checking both V1 and V2 keys.
 */
function getTiming(
  timings: Map<string, number>,
  v1Key: string,
  v2Key: string,
): number | undefined {
  return timings.get(v1Key) ?? timings.get(v2Key);
}

/**
 * Given an array of
 * {@link "library/dataStructures/processing/queryPlan"!QueryPlan `QueryPlan[]`},
 * extract information about passes and query dependencies tree.
 */
export function extractMetadata(data: QueryPlan[]): QueryPlanMetadata[] {
  const res: QueryPlanMetadata[] = data.map((query, queryId) => {
    const { planInfo } = query;
    const { clusterMemberId, mdxPass, globalTimings } = planInfo;

    const passInfo = (mdxPass || "Select_0").split("_");
    const passNumber = parseInt(passInfo[1], 10);

    return {
      id: queryId,
      parentId: null,
      passType: passInfo[0],
      pass: passNumber,
      name: clusterMemberId,
      contextTime: getTiming(
        globalTimings,
        "CONTEXT",
        "executionContextCreationTime",
      ),
      preparationTime: getTiming(
        globalTimings,
        "FINALIZATION",
        "finalizationTime",
      ),
      planningTime: getTiming(globalTimings, "PLANNING", "planningTime"),
      executionTime: getTiming(
        globalTimings,
        "EXECUTION",
        "queryExecutionTime",
      ),
    };
  });

  findChildrenAndParents(res, data);
  return res;
}

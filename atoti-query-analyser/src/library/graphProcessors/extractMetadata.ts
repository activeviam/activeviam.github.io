import { QueryPlan } from "../dataStructures/processing/queryPlan";
import {
  AggregateRetrieval,
  AggregateRetrievalKind,
} from "../dataStructures/json/retrieval";
import { computeIfAbsent, requireNonNull } from "../utilities/util";

export interface QueryPlanMetadata {
  passType: string;
  pass: number;
  name?: string;
  id: number;
  parentId: number | null;
}

function findChildrenAndParents(
  res: QueryPlanMetadata[],
  queries: QueryPlan[]
) {
  const resIndexByName = new Map(
    res.map((queryInfo) => [queryInfo.name, queryInfo])
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
        (name) => requireNonNull(resIndexByName.get(name)).id
      );

      // give its children their parentId
      underlyingDataNodes.forEach((name) => {
        requireNonNull(resIndexByName.get(name)).parentId = queryId;
      });
    });
  });
}

function dumpMetadata(metadata: QueryPlanMetadata[]) {
  const queriesByPass = new Map<number, Set<number>>();
  metadata.forEach((query) => {
    computeIfAbsent(queriesByPass, query.pass, () => new Set()).add(query.id);
  });

  const lines: string[] = [];
  lines.push("digraph PassInfo {");
  lines.push(
    'fontname="Helvetica,Arial,sans-serif"\n' +
      '\tnode [fontname="Helvetica,Arial,sans-serif",shape=box]\n' +
      '\tedge [fontname="Helvetica,Arial,sans-serif"]'
  );

  queriesByPass.forEach((queries, pass) => {
    lines.push(`subgraph cluster_pass_${pass} {`);
    lines.push("style=filled");
    lines.push("label=" + JSON.stringify(`Pass ${pass}`));
    lines.push("color=lightgrey");

    Array.from(queries).forEach((queryId) => {
      const queryMetadata = metadata[queryId];

      const label = Object.entries(queryMetadata)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");
      lines.push(`q${queryId} [label=${JSON.stringify(label)}]`);
      if (queryMetadata.parentId !== null) {
        lines.push(`q${queryMetadata.parentId} -> q${queryId}`);
      }
    });

    lines.push(`}`);
  });

  lines.push("}");
  console.log(lines.join("\n"));
}

export function extractMetadata(data: QueryPlan[]): QueryPlanMetadata[] {
  const res: QueryPlanMetadata[] = data.map((query, queryId) => {
    const { planInfo } = query;
    const { clusterMemberId, mdxPass } = planInfo;

    const passInfo = (mdxPass || "Select_0").split("_");
    const passNumber = parseInt(passInfo[1], 10);
    return {
      id: queryId,
      parentId: null,
      passType: passInfo[0],
      pass: passNumber,
      name: clusterMemberId,
    };
  });

  findChildrenAndParents(res, data);
  dumpMetadata(res);
  return res;
}

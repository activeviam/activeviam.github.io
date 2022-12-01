import { QueryPlan } from "../dataStructures/processing/queryPlan";
import { VertexSelection } from "../dataStructures/processing/selection";
import { AggregateRetrieval, AggregateRetrievalKind } from "../dataStructures/json/retrieval";
import { requireNonNull } from "../utilities/util";

interface QueryPlanMetadata {
  passType: string;
  pass: number;
  name: string | undefined;
  id: number;
  parentId: number | null;
}

function findChildrenAndParents(res: QueryPlanMetadata[], queries: QueryPlan[]) {
  const resIndexByName = new Map(res.map(queryInfo => ([queryInfo.name, queryInfo])));

  queries.forEach((query, queryId) => {
    const { graph } = query;
    graph.getVertices().forEach(vertex => {
      if (vertex.getMetadata().$kind !== AggregateRetrievalKind) {
        return;
      }
      
      const metadata = vertex.getMetadata() as AggregateRetrieval;
      const underlyingDataNodes = metadata.underlyingDataNodes;

      metadata.childrenIds = underlyingDataNodes.map(
        name => requireNonNull(resIndexByName.get(name)).id
      );

      // give its children their parentId
      underlyingDataNodes.forEach(name => {
        requireNonNull(resIndexByName.get(name)).parentId = queryId;
      });
    });
  });
}

export function parseJson(data: QueryPlan[], selections: VertexSelection[]) {
  const res = data.map((query, queryId) => {
    const { planInfo } = query;
    const { clusterMemberId, mdxPass } = planInfo;

    const passInfo = (mdxPass || "Select_0").split("_");
    const passNumber = parseInt(passInfo[1], 10);
    return {
      id: queryId,
      parentId: null,
      passType: passInfo[0],
      pass: passNumber,
      name: clusterMemberId
    };
  });

  findChildrenAndParents(res, data);
  return res;
}
import { Edge } from "../dataStructures/common/graph";
import {
  ARetrieval,
  CondensedRetrieval,
  CondensedRetrievalKind,
  RetrievalEdge,
  RetrievalGraph,
  RetrievalVertex,
} from "../dataStructures/json/retrieval";
import { TimingInfo } from "../dataStructures/json/timingInfo";
import { UUID } from "../utilities/uuid";

class FastRetrievalCondenser {
  private inEdgeIndex: Map<UUID, RetrievalEdge[]>;

  private outEdgeIndex: Map<UUID, RetrievalEdge[]>;

  private fastRetrievals: Set<UUID>;

  private fastRoots: Set<UUID>;

  private visibleFastRoots: Map<UUID, Set<UUID>>;

  private groupIdByRetrieval: Map<UUID, number>;

  private retrievalGroups: UUID[][];

  public constructor(private graph: RetrievalGraph, private threshold: number) {
    this.inEdgeIndex = this.buildInEdgeIndex();
    this.outEdgeIndex = this.buildOutEdgeIndex();
    this.fastRetrievals = this.collectFastRetrievals();
    this.fastRoots = this.findFastRoots();
    this.visibleFastRoots = this.findVisibleFastRoots();
    const { groupIdByRetrieval, retrievalGroups } =
      this.groupFastRetrievalsByRootSet();
    this.groupIdByRetrieval = groupIdByRetrieval;
    this.retrievalGroups = retrievalGroups;
  }

  public compute(): RetrievalGraph {
    const condensedRetrievals: ARetrieval[] = this.retrievalGroups
      .map((group) =>
        group.map((uuid) => this.graph.getVertexByUUID(uuid).getMetadata())
      )
      .map((group, id) => {
        if (group.length === 1) {
          return group[0];
        }
        return {
          $kind: CondensedRetrievalKind,
          retrievalId: id,
          timingInfo: this.computeTimingInfo(group),
          type: "CondensedRetrieval",
          underlyingRetrievals: group,
        } as CondensedRetrieval;
      });
    const condensedVertices: RetrievalVertex[] = condensedRetrievals.map(
      (retrieval) => new RetrievalVertex(retrieval)
    );

    const mapVertex = (uuid: UUID) => {
      if (this.fastRetrievals.has(uuid)) {
        return condensedVertices[this.groupIdByRetrieval.get(uuid) as number];
      } else {
        return this.graph.getVertexByUUID(uuid);
      }
    };

    const vertices: RetrievalVertex[] = [...condensedVertices];
    const rawEdges = new Map<RetrievalVertex, Set<RetrievalVertex>>();
    this.graph.getVertices().forEach((vertex) => {
      if (!this.fastRetrievals.has(vertex.getUUID())) {
        vertices.push(vertex);
      }

      const begin = mapVertex(vertex.getUUID());
      if (!rawEdges.has(begin)) {
        rawEdges.set(begin, new Set<RetrievalVertex>());
      }
      this.graph.getOutgoingEdges(vertex).forEach((edge) => {
        const end = mapVertex(edge.getEnd().getUUID());
        if (begin !== end) {
          (rawEdges.get(begin) as Set<RetrievalVertex>).add(end);
        }
      });
    });

    const edges: RetrievalEdge[] = [];
    rawEdges.forEach((ends, begin) =>
      ends.forEach((end) => {
        edges.push(new Edge({ criticalScore: 1 }, begin, end));
      })
    );

    const newGraph = new RetrievalGraph();
    vertices.forEach((vertex) => newGraph.addVertex(vertex));
    edges.forEach((edge) => newGraph.addEdge(edge));
    return newGraph;
  }

  private buildInEdgeIndex(): Map<UUID, RetrievalEdge[]> {
    const result = new Map<UUID, RetrievalEdge[]>();

    this.graph.getVertices().forEach((v) =>
      this.graph.getOutgoingEdges(v).forEach((e) => {
        if (!result.has(e.getEnd().getUUID())) {
          result.set(e.getEnd().getUUID(), []);
        }
        (result.get(e.getEnd().getUUID()) as RetrievalEdge[]).push(e);
      })
    );

    return result;
  }

  private buildOutEdgeIndex(): Map<UUID, RetrievalEdge[]> {
    const result = new Map<UUID, RetrievalEdge[]>();

    this.graph.getVertices().forEach((v) =>
      this.graph.getOutgoingEdges(v).forEach((e) => {
        if (!result.has(e.getBegin().getUUID())) {
          result.set(e.getBegin().getUUID(), []);
        }
        (result.get(e.getBegin().getUUID()) as RetrievalEdge[]).push(e);
      })
    );

    return result;
  }

  private collectFastRetrievals(): Set<UUID> {
    const result = new Set<UUID>();
    for (const vertex of Array.from(this.graph.getVertices())) {
      const elapsedTime = vertex.getMetadata().timingInfo.elapsedTime;
      if (elapsedTime === undefined) {
        continue;
      }
      const maxElapsedTime = elapsedTime.reduce(
        (acc, x) => Math.max(acc, x),
        0
      );
      if (maxElapsedTime <= this.threshold) {
        result.add(vertex.getUUID());
      }
    }
    return result;
  }

  private findFastRoots(): Set<UUID> {
    const result = new Set<UUID>();

    this.fastRetrievals.forEach((vertex) => {
      const inEdges = this.inEdgeIndex.get(vertex) as RetrievalEdge[];
      let isRoot = inEdges.length === 0;
      inEdges.forEach((edge) => {
        if (!this.fastRetrievals.has(edge.getBegin().getUUID())) {
          isRoot = true;
        }
      });
      if (isRoot) {
        result.add(vertex);
      }
    });

    return result;
  }

  private findVisibleFastRoots(): Map<UUID, Set<UUID>> {
    const result = new Map<UUID, Set<UUID>>();
    this.fastRetrievals.forEach((retr) => result.set(retr, new Set<UUID>()));

    this.fastRoots.forEach((root) => {
      (result.get(root) as Set<UUID>).add(root);
      const stack: [UUID, number][] = [[root, 0]];
      while (stack.length > 0) {
        const back = stack[stack.length - 1];
        if (
          back[1] === (this.outEdgeIndex.get(back[0]) as RetrievalEdge[]).length
        ) {
          stack.pop();
          continue;
        }

        const nextNode = (this.outEdgeIndex.get(back[0]) as RetrievalEdge[])[
          back[1]
        ].getEnd();
        ++back[1];

        if (!this.fastRetrievals.has(nextNode.getUUID())) {
          continue;
        }
        (result.get(nextNode.getUUID()) as Set<UUID>).add(root);
        stack.push([nextNode.getUUID(), 0]);
      }
    });

    return result;
  }

  private groupFastRetrievalsByRootSet() {
    const rootSetIndex = new Map<string, number>();
    const groupIdByRetrieval = new Map<UUID, number>();

    this.visibleFastRoots.forEach((rootSet, retrieval) => {
      const rootSetKey = Array.from(rootSet).sort().join();
      if (!rootSetIndex.has(rootSetKey)) {
        rootSetIndex.set(rootSetKey, rootSetIndex.size);
      }
      const groupId = rootSetIndex.get(rootSetKey) as number;
      groupIdByRetrieval.set(retrieval, groupId);
    });

    const retrievalGroups: UUID[][] = new Array(rootSetIndex.size);
    for (let i = 0; i < rootSetIndex.size; ++i) {
      retrievalGroups[i] = [];
    }

    groupIdByRetrieval.forEach((groupId, retrieval) => {
      retrievalGroups[groupId].push(retrieval);
    });

    return { groupIdByRetrieval, retrievalGroups };
  }

  private computeTimingInfo(group: ARetrieval[]): TimingInfo {
    const startTimes = group
      .flatMap((r) => r.timingInfo.startTime)
      .filter((x) => x !== undefined) as number[];
    const elapsedTimes = group
      .flatMap((r) => r.timingInfo.elapsedTime)
      .filter((x) => x !== undefined) as number[];
    const endTimes = startTimes.map(
      (startTime, idx) => startTime + elapsedTimes[idx]
    );

    const beginTime = Math.min(...startTimes);
    const endTime = Math.max(...endTimes);

    return {
      startTime: [beginTime],
      elapsedTime: [endTime - beginTime],
    };
  }
}

/**
 * Finds groups of fast retrievals (i.e. retrievals with 0ms elapsed time) and collapses them.
 */
export function condenseFastRetrievals(
  graph: RetrievalGraph,
  threshold: number
): RetrievalGraph {
  const result = new FastRetrievalCondenser(graph, threshold).compute();

  result.labelVertex(
    graph.getVertexByLabel("virtualSource").getUUID(),
    "virtualSource"
  );
  result.labelVertex(
    graph.getVertexByLabel("virtualTarget").getUUID(),
    "virtualTarget"
  );

  return result;
}

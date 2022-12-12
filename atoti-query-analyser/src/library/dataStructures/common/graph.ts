import { requireNonNull, computeIfAbsent } from "../../utilities/util";
import { UUID, generateUUID } from "../../utilities/uuid";

export interface IVertex<VertexMetadata> {
  getMetadata(): VertexMetadata;

  getUUID(): UUID;
}

export interface IEdge<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>
> {
  getBegin(): Vertex;

  getEnd(): Vertex;

  getMetadata(): EdgeMetadata;

  getUUID(): UUID;
}

export class Vertex<VertexMetadata> implements IVertex<VertexMetadata> {
  private readonly uuid: UUID;

  constructor(private readonly metadata: VertexMetadata) {
    this.uuid = generateUUID();
  }

  getMetadata(): VertexMetadata {
    return this.metadata;
  }

  getUUID(): UUID {
    return this.uuid;
  }
}

export class Edge<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>
> implements IEdge<VertexMetadata, EdgeMetadata, Vertex>
{
  private readonly uuid: UUID;

  constructor(
    private readonly metadata: EdgeMetadata,
    private readonly begin: Vertex,
    private readonly end: Vertex
  ) {
    this.uuid = generateUUID();
  }

  getBegin(): Vertex {
    return this.begin;
  }

  getEnd(): Vertex {
    return this.end;
  }

  getMetadata(): EdgeMetadata {
    return this.metadata;
  }

  getUUID(): UUID {
    return this.uuid;
  }
}

export interface IGraph<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>
> {
  getVertices(): Set<Vertex>;

  getOutgoingEdges(vertex: Vertex): Set<Edge>;

  getVertexCount(): number;
}

class AdjacencyListGraphBase<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>
> implements IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
{
  protected readonly vertexMap: Map<Vertex, Set<Edge>>;

  protected readonly vertexByUUID: Map<UUID, Vertex>;

  protected readonly edgeByUUID: Map<UUID, Edge>;

  protected readonly vertexByLabel: Map<string, Vertex>;

  constructor() {
    this.vertexMap = new Map();
    this.vertexByUUID = new Map();
    this.edgeByUUID = new Map();
    this.vertexByLabel = new Map();
  }

  getOutgoingEdges(vertex: Vertex): Set<Edge> {
    return requireNonNull(this.vertexMap.get(vertex));
  }

  getVertexCount(): number {
    return this.vertexMap.size;
  }

  getVertices(): Set<Vertex> {
    return new Set(this.vertexMap.keys());
  }

  hasVertex(uuid: UUID): boolean {
    return this.vertexByUUID.has(uuid);
  }

  getVertexByUUID(uuid: UUID): Vertex {
    return requireNonNull(this.vertexByUUID.get(uuid));
  }

  getEdgeByUUID(uuid: UUID): Edge {
    return requireNonNull(this.edgeByUUID.get(uuid));
  }

  addVertex(vertex: Vertex): UUID {
    this.vertexMap.set(vertex, new Set());
    this.vertexByUUID.set(vertex.getUUID(), vertex);
    return vertex.getUUID();
  }

  labelVertex(uuid: UUID, label: string): void {
    this.vertexByLabel.set(label, requireNonNull(this.vertexByUUID.get(uuid)));
  }

  getVertexByLabel(label: string): Vertex {
    return requireNonNull(this.vertexByLabel.get(label));
  }

  addEdge(edge: Edge): UUID {
    computeIfAbsent(this.vertexMap, edge.getBegin(), () => new Set()).add(edge);
    this.edgeByUUID.set(edge.getUUID(), edge);
    return edge.getUUID();
  }

  dumps(): string {
    const result = [];
    const mangle = (text: string) =>
      "_" + text.replaceAll(/[^a-zA-Z0-9]/g, "_");
    result.push("digraph G {");

    const vertexLabels = new Map<IVertex<VertexMetadata>, string>();
    this.vertexByLabel.forEach((vertex, label) => {
      vertexLabels.set(vertex, label);
    });

    this.vertexMap.forEach((edges, vertex) => {
      let vertexStr = "    " + mangle(vertex.getUUID());
      if (vertexLabels.has(vertex)) {
        vertexStr += ` [label=${JSON.stringify(vertexLabels.get(vertex))}]`;
      }
      result.push(vertexStr + ";");

      edges.forEach((edge) => {
        result.push(
          "    " +
            mangle(edge.getBegin().getUUID()) +
            " -> " +
            mangle(edge.getEnd().getUUID()) +
            ";"
        );
      });
    });

    result.push("}");
    return result.join("\n");
  }
}

export class AdjacencyListGraph<
  VertexMetadata,
  EdgeMetadata
> extends AdjacencyListGraphBase<
  VertexMetadata,
  EdgeMetadata,
  Vertex<VertexMetadata>,
  Edge<VertexMetadata, EdgeMetadata, Vertex<VertexMetadata>>
> {
  createEdge(fromUUID: UUID, toUUID: UUID, metadata: EdgeMetadata): UUID {
    const from = this.getVertexByUUID(fromUUID);
    const to = this.getVertexByUUID(toUUID);

    const edge = new Edge(metadata, from, to);
    return this.addEdge(edge);
  }

  filterVertices(
    predicate: (vertex: Vertex<VertexMetadata>) => boolean
  ): AdjacencyListGraph<VertexMetadata, EdgeMetadata> {
    const result = new AdjacencyListGraph<VertexMetadata, EdgeMetadata>();

    this.vertexByUUID.forEach((vertex) => {
      if (predicate(vertex)) {
        result.addVertex(vertex);
      }
    });

    this.edgeByUUID.forEach((edge) => {
      if (!result.vertexMap.has(edge.getBegin())) {
        return;
      }
      if (!result.vertexMap.has(edge.getEnd())) {
        return;
      }
      result.addEdge(edge);
    });

    this.vertexByLabel.forEach((vertex, label) => {
      if (result.vertexMap.has(vertex)) {
        result.labelVertex(vertex.getUUID(), label);
      }
    });

    return result;
  }

  inverse(): AdjacencyListGraph<VertexMetadata, EdgeMetadata> {
    const result = new AdjacencyListGraph<VertexMetadata, EdgeMetadata>();

    this.vertexByUUID.forEach(result.addVertex.bind(result));
    this.edgeByUUID.forEach((edge) => {
      result.createEdge(
        edge.getEnd().getUUID(),
        edge.getBegin().getUUID(),
        Object.assign({}, edge.getMetadata())
      );
    });

    this.vertexByLabel.forEach((vertex, label) => {
      result.vertexByLabel.set(label, vertex);
    });

    return result;
  }
}

export interface IGraphObserver<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
> {
  onBeginSearch(graph: Graph): void;

  onEndSearch(): void;

  onVertexDiscover(vertex: Vertex): void;

  onEdgeDiscover(edge: Edge): void;

  onVertexEnter(vertex: Vertex): void;

  onVertexExit(vertex: Vertex): void;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export class AGraphObserver<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
> implements IGraphObserver<VertexMetadata, EdgeMetadata, Vertex, Edge, Graph>
{
  onBeginSearch(graph: Graph): void {}

  onEdgeDiscover(edge: Edge): void {}

  onEndSearch(): void {}

  onVertexDiscover(vertex: Vertex): void {}

  onVertexEnter(vertex: Vertex): void {}

  onVertexExit(vertex: Vertex): void {}
}

/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * This class encapsulates depth-first search (DFS) algorithm. This algorithm is used to traverse graphs.
 * <br>
 * The algorithm starts at the <i>root node</i>. From each node, the algorithm explores all the outgoing edges.
 * When the algorithm discovers a new node, it runs recursively from this new node. When no more edges are unexplored,
 * the algorithm exits.
 * */
class Dfs<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
> {
  private visitedVertices: Set<Vertex> = new Set();

  constructor(
    public graph: Graph,
    public rootNodes: Vertex[],
    public observer: IGraphObserver<
      VertexMetadata,
      EdgeMetadata,
      Vertex,
      Edge,
      Graph
    >
  ) {}

  private isVisited(node: Vertex): boolean {
    return this.visitedVertices.has(node);
  }

  private markAsVisited(node: Vertex) {
    this.visitedVertices.add(node);
  }

  /**
   * Non-recursive implementation of algorithm (with explicit stack). The semantics
   * is equivalent to one of the {@link doDfs} method.
   * */
  private doDfsNonRecursive(): void {
    const goDeeper = (node: Vertex) => {
      this.observer.onVertexDiscover(node);

      this.markAsVisited(node);
      this.observer.onVertexEnter(node);

      const edges = Array.from(this.graph.getOutgoingEdges(node));

      return { node, edges, idx: 0 };
    };

    this.rootNodes.forEach((rootNode) => {
      if (this.isVisited(rootNode)) {
        return;
      }

      const stack = [goDeeper(rootNode)];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];

        if (frame.idx === frame.edges.length) {
          this.observer.onVertexExit(frame.node);
          stack.pop();
        } else {
          const edge = frame.edges[frame.idx++];
          this.observer.onEdgeDiscover(edge);
          const nextVertex = edge.getEnd();
          if (!this.isVisited(nextVertex)) {
            stack.push(goDeeper(nextVertex));
          }
        }
      }
    });
  }

  /**
   * Reference (recursive) implementation. On large graphs may cause stack overflow.
   * */
  private doDfs(node: Vertex): void {
    this.observer.onVertexDiscover(node);

    this.markAsVisited(node);
    this.observer.onVertexEnter(node);

    this.graph.getOutgoingEdges(node).forEach((edge) => {
      this.observer.onEdgeDiscover(edge);
      const nextVertex = edge.getEnd();
      if (!this.isVisited(nextVertex)) {
        this.doDfs(nextVertex);
      }
    });

    this.observer.onVertexExit(node);
  }

  run(): void {
    this.observer.onBeginSearch(this.graph);
    this.doDfsNonRecursive();
    this.observer.onEndSearch();
  }
}

class AcyclicGraphFunctionCalculator<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>,
  T
> extends AGraphObserver<VertexMetadata, EdgeMetadata, Vertex, Edge, Graph> {
  public readonly functionValues = new Map<Vertex, T>();

  private readonly children = new Map<Vertex, Set<Vertex>>();

  constructor(
    private reducer: (
      vertex: Vertex,
      children: Set<Vertex>,
      childrenValues: (child: Vertex) => T
    ) => T
  ) {
    super();
  }

  onEdgeDiscover(edge: Edge) {
    (this.children.get(edge.getBegin()) as Set<Vertex>).add(edge.getEnd());
  }

  onVertexDiscover(vertex: Vertex) {
    this.children.set(vertex, new Set());
  }

  onVertexExit(vertex: Vertex) {
    const children = this.children.get(vertex) as Set<Vertex>;
    const getter = (child: Vertex): T => {
      if (!children.has(child)) {
        throw new Error(`${child} is not a child of ${vertex}`);
      }
      return this.functionValues.get(child) as T;
    };
    this.functionValues.set(vertex, this.reducer(vertex, children, getter));
  }
}

/**
 * Run depth-first search from each of the `rootNodes`, signalling steps to the
 * provided observer.
 */
export function multiDfs<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
>(
  graph: Graph,
  rootNodes: Vertex[],
  observer: IGraphObserver<VertexMetadata, EdgeMetadata, Vertex, Edge, Graph>
): void {
  new Dfs(graph, rootNodes, observer).run();
}

/**
 * Run depth-first search from the `rootNode`, signalling steps to the provided
 * observer.
 */
export function dfs<
  VertexMetadata,
  EdgeMetadata,
  Vertex extends IVertex<VertexMetadata>,
  Edge extends IEdge<VertexMetadata, EdgeMetadata, Vertex>,
  Graph extends IGraph<VertexMetadata, EdgeMetadata, Vertex, Edge>
>(
  graph: Graph,
  rootNode: Vertex,
  observer: IGraphObserver<VertexMetadata, EdgeMetadata, Vertex, Edge, Graph>
): void {
  multiDfs<VertexMetadata, EdgeMetadata, Vertex, Edge, Graph>(
    graph,
    [rootNode],
    observer
  );
}

/**
 * Given a direct acyclic graph (DAG), a vertex int it and a function, do the
 * following:
 * 1. Run recursively from all children of the vertex;
 * 2. Compute function in the vertex, providing already computed values of this
 * function in children vertices.
 */
export function applyOnDAG<
  Vertex extends IVertex<unknown>,
  Graph extends IGraph<
    unknown,
    unknown,
    Vertex,
    IEdge<unknown, unknown, Vertex>
  >,
  T
>(
  graph: Graph,
  rootNode: Vertex,
  reducer: (
    vertex: Vertex,
    children: Set<Vertex>,
    childrenValues: (child: Vertex) => T
  ) => T
): Map<Vertex, T> {
  const observer = new AcyclicGraphFunctionCalculator(reducer);
  dfs(graph, rootNode, observer);
  return observer.functionValues;
}

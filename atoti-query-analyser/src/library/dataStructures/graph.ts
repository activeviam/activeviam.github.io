import uuid from "uuid";
import { Queue } from "./queue";
import { requireNonNull, computeIfAbsent } from "../utilities/util";

export interface IVertex {
  getUUID(): string;

  getMetadata(): Map<string, any>;
}

export interface IEdge<T extends IVertex> {
  getUUID(): string;

  getBegin(): T;

  getEnd(): T;

  getMetadata(): Map<string, any>;
}

export interface IGraph<T extends IVertex> {
  getVertices(): Set<T>;

  getOutgoingEdges(vertex: T): Set<IEdge<T>>;

  getVertexCount(): number;
}

export class Vertex implements IVertex {
  private readonly uuid: string;

  constructor(private readonly metadata: Map<string, any>) {
    this.uuid = uuid.v4();
  }

  getMetadata(): Map<string, any> {
    return this.metadata;
  }

  getUUID(): string {
    return this.uuid;
  }
}

export class Edge<T extends IVertex> implements IEdge<T> {
  private readonly uuid: string;

  constructor(
    private readonly metadata: Map<string, any>,
    private readonly begin: T,
    private readonly end: T
  ) {
    this.uuid = uuid.v4();
  }

  getBegin(): T {
    return this.begin;
  }

  getEnd(): T {
    return this.end;
  }

  getMetadata(): Map<string, any> {
    return this.metadata;
  }

  getUUID(): string {
    return this.uuid;
  }

}

export class AdjacencyListGraph<T extends IVertex> implements IGraph<T> {
  private readonly vertexMap: Map<T, Set<IEdge<T>>>;
  private readonly vertexByUUID: Map<string, T>;
  private readonly edgeByUUID: Map<string, Edge<T>>;
  private readonly vertexByLabel: Map<string, T>;

  constructor() {
    this.vertexMap = new Map();
    this.vertexByUUID = new Map();
    this.edgeByUUID = new Map();
    this.vertexByLabel = new Map();
  }

  getOutgoingEdges(vertex: T): Set<IEdge<T>> {
    return requireNonNull(this.vertexMap.get(vertex));
  }

  getVertexCount(): number {
    return this.vertexMap.size;
  }

  getVertices(): Set<T> {
    return new Set(this.vertexMap.keys());
  }

  hasVertex(uuid: string): boolean {
    return this.vertexByUUID.has(uuid);
  }

  getVertexByUUID(uuid: string): T {
    return requireNonNull(this.vertexByUUID.get(uuid));
  }

  getEdgeByUUID(uuid: string): IEdge<T> {
    return requireNonNull(this.edgeByUUID.get(uuid));
  }

  addVertex(vertex: T): string {
    this.vertexMap.set(vertex, new Set());
    this.vertexByUUID.set(vertex.getUUID(), vertex);
    return vertex.getUUID();
  }

  labelVertex(uuid: string, label: string): void {
    this.vertexByLabel.set(label, requireNonNull(this.vertexByUUID.get(uuid)));
  }

  getVertexByLabel(label: string): T {
    return requireNonNull(this.vertexByLabel.get(label));
  }

  createEdge(fromUUID: string, toUUID: string, metadata: Map<string, any>): string {
    const from = this.getVertexByUUID(fromUUID);
    const to = this.getVertexByUUID(toUUID);

    const edge = new Edge<T>(metadata, from, to);
    return this.addEdge(edge);
  }

  addEdge(edge: Edge<T>): string {
    computeIfAbsent(this.vertexMap, edge.getBegin(), () => new Set()).add(edge);
    this.edgeByUUID.set(edge.getUUID(), edge);
    return edge.getUUID();
  }

  filterVertices(predicate: (vertex: T) => boolean): AdjacencyListGraph<T> {
    const result = new AdjacencyListGraph<T>();

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

  inverse(): AdjacencyListGraph<T> {
    const result = new AdjacencyListGraph<T>();

    this.vertexByUUID.forEach(result.addVertex.bind(result));
    this.edgeByUUID.forEach((edge) => {
      result.createEdge(edge.getEnd().getUUID(), edge.getBegin().getUUID(), new Map(edge.getMetadata()));
    });

    this.vertexByLabel.forEach((vertex, label) => {
      result.vertexByLabel.set(label, vertex);
    });

    return result;
  }

  dumps(): string {
    const result = [];
    const mangle = (text: string) => "_" + text.replaceAll(/[^a-zA-Z0-9]/g, "_");
    result.push("digraph G {");

    const vertexLabels = new Map<T, string>();
    this.vertexByLabel.forEach((vertex, label) => {
      vertexLabels.set(vertex, label);
    });

    this.vertexMap.forEach((edges, vertex) => {
      let vertexStr = "    " + mangle(vertex.getUUID());
      if (vertexLabels.has(vertex)) {
        vertexStr += ` [label=${JSON.stringify(vertexLabels.get(vertex))}]`;
      }
      result.push(vertexStr + ";");

      edges.forEach(edge => {
        result.push("    " + mangle(edge.getBegin().getUUID()) + " -> " + mangle(edge.getEnd().getUUID()) + ";");
      });
    });

    result.push("}");
    return result.join("\n");
  }
}

export interface IGraphObserver<T extends IVertex> {
  onBeginSearch(graph: IGraph<T>): void;

  onEndSearch(): void;

  onVertexDiscover(vertex: T): void;

  onEdgeDiscover(edge: IEdge<T>): void;

  onVertexEnter(vertex: T): void;

  onVertexExit(vertex: T): void;
}

export class AGraphObserver<T extends IVertex> implements IGraphObserver<T> {
  onBeginSearch(graph: IGraph<T>): void {
  }

  onEdgeDiscover(edge: IEdge<T>): void {
  }

  onEndSearch(): void {
  }

  onVertexDiscover(vertex: T): void {
  }

  onVertexEnter(vertex: T): void {
  }

  onVertexExit(vertex: T): void {
  }

}

export function bfs<T extends IVertex>(graph: IGraph<T>, rootNode: T, observer: IGraphObserver<T>): void {
  observer.onBeginSearch(graph);

  const visited = new Set<T>();
  const queue = new Queue<T>();

  queue.push(rootNode);
  visited.add(rootNode);
  observer.onVertexDiscover(rootNode);
  while (!queue.empty()) {
    const vertex = requireNonNull(queue.pop());
    observer.onVertexEnter(vertex);

    graph.getOutgoingEdges(vertex).forEach(edge => {
      observer.onEdgeDiscover(edge);
      const nextVertex = edge.getEnd();
      if (!visited.has(nextVertex)) {
        queue.push(nextVertex);
        visited.add(nextVertex);
      }
    });

    observer.onVertexExit(vertex);
  }

  observer.onEndSearch();
}

class Dfs<T extends IVertex> {
  private vertexColors: Map<T, number> = new Map();
  private static readonly COLOR_WHITE = 0;
  private static readonly COLOR_GRAY = 1;
  private static readonly COLOR_BLACK = 2;

  constructor(public graph: IGraph<T>, public rootNodes: Array<T>, public observer: IGraphObserver<T>) {
  }

  private getColor(node: T): number {
    if (this.vertexColors.has(node)) {
      return this.vertexColors.get(node) as number;
    }
    return Dfs.COLOR_WHITE;
  }

  private setColor(node: T, color: number) {
    this.vertexColors.set(node, color);
  }

  doDfsNonRecursive(): void {
    const goDeeper = (node: T) => {
      this.observer.onVertexDiscover(node);

      this.setColor(node, Dfs.COLOR_GRAY);
      this.observer.onVertexEnter(node);

      const edges = Array.from(this.graph.getOutgoingEdges(node));

      return { node, edges, idx: 0 };
    };

    this.rootNodes.forEach(rootNode => {
      if (this.getColor(rootNode) !== Dfs.COLOR_WHITE) {
        return;
      }

      const stack = [goDeeper(rootNode)];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];

        if (frame.idx === frame.edges.length) {
          this.setColor(frame.node, Dfs.COLOR_BLACK);
          this.observer.onVertexExit(frame.node);
          stack.pop();
        } else {
          const edge = frame.edges[frame.idx++];
          this.observer.onEdgeDiscover(edge);
          const nextVertex = edge.getEnd();
          if (this.getColor(nextVertex) === Dfs.COLOR_WHITE) {
            stack.push(goDeeper(nextVertex));
          }
        }
      }
    });
  }

  doDfs(node: T): void {
    this.observer.onVertexDiscover(node);

    this.setColor(node, Dfs.COLOR_GRAY);
    this.observer.onVertexEnter(node);

    this.graph.getOutgoingEdges(node).forEach(edge => {
      this.observer.onEdgeDiscover(edge);
      const nextVertex = edge.getEnd();
      if (this.getColor(nextVertex) === Dfs.COLOR_WHITE) {
        this.doDfs(nextVertex);
      }
    });

    this.setColor(node, Dfs.COLOR_BLACK);
    this.observer.onVertexExit(node);
  }

  run(): void {
    this.observer.onBeginSearch(this.graph);
    this.doDfsNonRecursive();
    this.observer.onEndSearch();
  }
}

class AcyclicGraphFunctionCalculator<T extends IVertex, U> extends AGraphObserver<T> {
  public readonly functionValues = new Map<T, U>();
  private readonly neighbours = new Map<T, Set<T>>();

  constructor(private reducer: (vertex: T, neighbours: Set<T>, accumulator: Map<T, U>) => U) {
    super();
  }

  onEdgeDiscover(edge: IEdge<T>) {
    (this.neighbours.get(edge.getBegin()) as Set<T>).add(edge.getEnd());
  }

  onVertexDiscover(vertex: T) {
    this.neighbours.set(vertex, new Set());
  }

  onVertexExit(vertex: T) {
    this.functionValues.set(vertex, this.reducer(vertex, this.neighbours.get(vertex) as Set<T>, this.functionValues));
  }
}

export function dfs<T extends IVertex>(graph: IGraph<T>, rootNode: T, observer: IGraphObserver<T>): void {
  multiDfs(graph, [rootNode], observer);
}

export function multiDfs<T extends IVertex>(graph: IGraph<T>, rootNodes: T[], observer: IGraphObserver<T>): void {
  new Dfs(graph, rootNodes, observer).run();
}

export function applyOnDAG<T extends IVertex, U>(
  graph: IGraph<T>,
  rootNode: T,
  reducer: (vertex: T, neighbours: Set<T>, accumulator: Map<T, U>) => U
): Map<T, U> {
  const observer = new AcyclicGraphFunctionCalculator(reducer);
  dfs(graph, rootNode, observer);
  return observer.functionValues;
}
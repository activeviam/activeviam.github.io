import { describe, it, expect } from "vitest";
import {
  AdjacencyListGraph,
  AGraphObserver,
  applyOnDAG,
  dfs,
  Edge,
  Vertex,
} from "library/dataStructures/common/graph";
import { UnionFind } from "library/dataStructures/common/unionFind";
import { Dictionary } from "library/dataStructures/common/dictionary";

type TestGraph = AdjacencyListGraph<string, number>;

/** Build the diamond graph a -> b, a -> c, b -> d, c -> d. */
function diamond() {
  const graph: TestGraph = new AdjacencyListGraph();
  const [a, b, c, d] = ["a", "b", "c", "d"].map((name) => {
    const vertex = new Vertex(name);
    graph.addVertex(vertex);
    return vertex;
  });
  graph.labelVertex(a.getUUID(), "root");
  graph.createEdge(a.getUUID(), b.getUUID(), 1);
  graph.createEdge(a.getUUID(), c.getUUID(), 2);
  graph.createEdge(b.getUUID(), d.getUUID(), 3);
  graph.createEdge(c.getUUID(), d.getUUID(), 4);
  return { graph, a, b, c, d };
}

const names = (vertices: Iterable<Vertex<string>>) =>
  Array.from(vertices, (vertex) => vertex.getMetadata()).sort();

const successors = (graph: TestGraph, vertex: Vertex<string>) =>
  names(Array.from(graph.getOutgoingEdges(vertex), (edge) => edge.getEnd()));

describe("AdjacencyListGraph", () => {
  it("stores vertices, labels and edges", () => {
    const { graph, a, d } = diamond();
    expect(graph.getVertexCount()).toBe(4);
    expect(graph.hasVertex(a.getUUID())).toBe(true);
    expect(graph.getVertexByUUID(d.getUUID())).toBe(d);
    expect(graph.getVertexByLabel("root")).toBe(a);
    expect(successors(graph, a)).toEqual(["b", "c"]);
    expect(successors(graph, d)).toEqual([]);

    const [edge] = Array.from(graph.getOutgoingEdges(a));
    expect(graph.getEdgeByUUID(edge.getUUID())).toBe(edge);
  });

  it("builds an induced subgraph", () => {
    const { graph, a, b } = diamond();
    const subgraph = graph.filterVertices((vertex) => vertex.getMetadata() !== "c");
    expect(names(subgraph.getVertices())).toEqual(["a", "b", "d"]);
    expect(successors(subgraph, a)).toEqual(["b"]);
    expect(successors(subgraph, b)).toEqual(["d"]);
    expect(subgraph.getVertexByLabel("root")).toBe(a);

    const withoutRoot = graph.filterVertices((vertex) => vertex !== a);
    expect(() => withoutRoot.getVertexByLabel("root")).toThrow();
  });

  it("inverts the edges", () => {
    const { graph, a, d } = diamond();
    const inverse = graph.inverse();
    expect(successors(inverse, d)).toEqual(["b", "c"]);
    expect(successors(inverse, a)).toEqual([]);
    expect(inverse.getVertexByLabel("root")).toBe(a);
  });

  it("exports to the DOT format", () => {
    const { graph } = diamond();
    const dot = graph.dumps();
    expect(dot.startsWith("digraph G {")).toBe(true);
    expect(dot).toContain('[label="root"]');
    expect(dot.match(/->/g)).toHaveLength(4);
  });

  it("throws on unknown vertices", () => {
    const { graph } = diamond();
    const outsider = new Vertex("x");
    expect(() => graph.getVertexByLabel("unknown")).toThrow();
    expect(() => graph.getVertexByUUID(outsider.getUUID())).toThrow();
    expect(() => graph.createEdge(outsider.getUUID(), outsider.getUUID(), 0)).toThrow();
  });
});

describe("graph traversals", () => {
  it("visits each reachable vertex once in depth-first order", () => {
    const { graph, a } = diamond();
    const entered: string[] = [];
    const exited: string[] = [];
    let edges = 0;

    class Recorder extends AGraphObserver<
      string,
      number,
      Vertex<string>,
      Edge<string, number, Vertex<string>>,
      TestGraph
    > {
      onVertexEnter(vertex: Vertex<string>) {
        entered.push(vertex.getMetadata());
      }

      onVertexExit(vertex: Vertex<string>) {
        exited.push(vertex.getMetadata());
      }

      onEdgeDiscover() {
        edges++;
      }
    }

    dfs(graph, a, new Recorder());
    expect([...entered].sort()).toEqual(["a", "b", "c", "d"]);
    expect(entered[0]).toBe("a");
    expect(exited[exited.length - 1]).toBe("a");
    expect(exited.indexOf("d")).toBeLessThan(exited.indexOf("b"));
    expect(edges).toBe(4);
  });

  it("computes a function over a DAG from the children values", () => {
    const { graph, a, d } = diamond();
    const height = applyOnDAG(
      graph,
      a,
      (_vertex, children, childValue: (child: Vertex<string>) => number) =>
        children.size === 0 ? 0 : 1 + Math.max(...Array.from(children, childValue)),
    );
    expect(height.get(a)).toBe(2);
    expect(height.get(d)).toBe(0);
  });
});

describe("UnionFind", () => {
  it("merges sets", () => {
    const sets = new UnionFind<number>();
    expect(sets.find(1)).toBe(1);
    sets.union(1, 2);
    sets.union(3, 4);
    sets.union(2, 4);
    sets.union(1, 4);
    sets.union(5, 6);
    sets.union(7, 5);
    expect(new Set([1, 2, 3, 4].map((x) => sets.find(x))).size).toBe(1);
    expect(sets.find(5)).toBe(sets.find(7));
    expect(sets.find(1)).not.toBe(sets.find(5));
  });
});

describe("Dictionary", () => {
  it("numbers the keys in their order of appearance", () => {
    const dictionary = new Dictionary<string>();
    expect(["a", "b", "a", "c", "b"].map((key) => dictionary.index(key))).toEqual([0, 1, 0, 2, 1]);
    expect(dictionary.size).toBe(3);
  });
});

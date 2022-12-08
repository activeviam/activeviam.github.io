// This module is based on paper "Dynamic Hierarchical Graph Drawing" by Alaa A. K. Ismaeel

import { AdjacencyListGraph } from "../dataStructures/common/graph";
import { generateUUID, UUID } from "../utilities/uuid";
import { computeIfAbsent, requireNonNull } from "../utilities/util";

export interface EfficientBarycenterCrossMinimizerSettings {
  maxIterations: number;
}

export interface GraphLayoutSettings {
  minVertexWidth: number;
  recommendedLayerMaxWidth: number;
  maxWidthMultiplier: number;
  layerHeight: number;
  crossMinimizerSettings: EfficientBarycenterCrossMinimizerSettings;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface GraphLayout {
  vertexCoordinates: Map<UUID, Point2D>;
  edgeAnchorPoints: Map<UUID, Point2D[]>;
}

class MinWidthLayeringAlgorithm {
  private readonly verticesToProcess: Set<UUID>;

  private readonly processedVertices: Set<UUID> = new Set();

  private readonly inDegree: Map<UUID, number> = new Map();

  private readonly outDegree: Map<UUID, number> = new Map();

  constructor(
    private graph: AdjacencyListGraph<unknown, unknown>,
    private settings: GraphLayoutSettings,
    private layerMap: Map<UUID, number>
  ) {
    this.verticesToProcess = new Set(
      Array.from(graph.getVertices()).map((vertex) => vertex.getUUID())
    );
  }

  private calculateDegrees(): void {
    Array.from(this.graph.getVertices()).forEach((vertex) => {
      Array.from(this.graph.getOutgoingEdges(vertex)).forEach((edge) => {
        const begin = edge.getBegin().getUUID();
        const end = edge.getEnd().getUUID();
        this.inDegree.set(end, (this.inDegree.get(end) || 0) + 1);
        this.outDegree.set(begin, (this.outDegree.get(begin) || 0) + 1);
      });
    });
  }

  work(): void {
    this.calculateDegrees();

    let currentLayer = 0;
    let widthCurrent = 0;
    let widthUp = 0;

    const conditionGoUp = (v: UUID) =>
      (widthCurrent >= this.settings.recommendedLayerMaxWidth &&
        requireNonNull(this.outDegree.get(v)) < 1) ||
      widthUp >=
        this.settings.recommendedLayerMaxWidth *
          this.settings.maxWidthMultiplier;

    while (this.verticesToProcess.size > 0) {
      const candidateVertices = Array.from(this.verticesToProcess).filter(
        (v) => {
          const edges = Array.from(
            this.graph.getOutgoingEdges(this.graph.getVertexByUUID(v))
          );
          for (let edge of edges) {
            if (!this.processedVertices.has(edge.getEnd().getUUID())) {
              return false;
            }
          }
          return true;
        }
      );

      if (candidateVertices.length > 0) {
        const candidate = candidateVertices.reduce((lhs, rhs) =>
          computeIfAbsent(this.outDegree, lhs, () => 0) <
          computeIfAbsent(this.outDegree, rhs, () => 0)
            ? rhs
            : lhs
        );

        this.layerMap.set(candidate, currentLayer);
        this.verticesToProcess.delete(candidate);
        widthCurrent -= computeIfAbsent(this.outDegree, candidate, () => 0) - 1;
        widthUp += computeIfAbsent(this.inDegree, candidate, () => 0);

        if (!conditionGoUp(candidate)) {
          continue;
        }
      }

      ++currentLayer;
      widthCurrent = widthUp;
      widthUp = 0;

      Array.from(this.graph.getVertices())
        .map((v) => v.getUUID())
        .filter((v) => !this.verticesToProcess.has(v))
        .forEach((v) => this.processedVertices.add(v));
    }
  }
}

interface ShortEdge {
  from: UUID;
  to: UUID;
}

interface LongEdge {
  edgeId: UUID;
  shortEdges: ShortEdge[];
}

class EfficientBarycenterCrossMinimizer {
  private didUpdate: boolean = false;

  private readonly coordinateMapping: Map<UUID, number> = new Map();

  private reverseShortEdges: Map<UUID, Set<ShortEdge>> = new Map();

  constructor(
    private layers: UUID[][],
    private layerMap: Map<UUID, number>,
    private shortEdges: Map<UUID, Set<ShortEdge>>,
    private settings: EfficientBarycenterCrossMinimizerSettings
  ) {}

  private inDegree(vertex: UUID): number {
    return computeIfAbsent(this.reverseShortEdges, vertex, () => new Set())
      .size;
  }

  private outDegree(vertex: UUID): number {
    return computeIfAbsent(this.shortEdges, vertex, () => new Set()).size;
  }

  private coordinate(vertex: UUID): number {
    return requireNonNull(this.coordinateMapping.get(vertex));
  }

  private bary(vertex: UUID): number {
    const inDegree = this.inDegree(vertex);
    const outDegree = this.outDegree(vertex);

    let result = 0;
    let summands = 0;
    if (inDegree > 0) {
      result +=
        Array.from(requireNonNull(this.reverseShortEdges.get(vertex)))
          .map((edge) => this.coordinate(edge.from))
          .reduce((a, b) => a + b) / inDegree;
      ++summands;
    }
    if (outDegree > 0) {
      result +=
        Array.from(requireNonNull(this.shortEdges.get(vertex)))
          .map((edge) => this.coordinate(edge.to))
          .reduce((a, b) => a + b) / outDegree;
      ++summands;
    }

    return summands === 0 ? 0 : result / summands;
  }

  private updateCoordinateMapping(level: number): void {
    this.layers[level].forEach((vertex, index) =>
      this.coordinateMapping.set(vertex, index)
    );
  }

  private doIteration(): void {
    for (let levelIndex = 0; levelIndex < this.layers.length; ++levelIndex) {
      const bary = this.layers[levelIndex].map((vertex) => ({
        vertex,
        bary: this.bary(vertex),
      }));

      bary.sort((lhs, rhs) => lhs.bary - rhs.bary);

      let layerUpdated = false;
      bary.forEach(({ vertex }, index) => {
        if (this.layers[levelIndex][index] !== vertex) {
          layerUpdated = true;
        }
        this.layers[levelIndex][index] = vertex;
      });
      if (layerUpdated) {
        this.didUpdate = true;
        this.updateCoordinateMapping(levelIndex);
      }
    }
  }

  private calculateReverseShortEdges(): void {
    Array.from(this.shortEdges.values()).forEach((set) =>
      Array.from(set).forEach((edge) => {
        computeIfAbsent(this.reverseShortEdges, edge.to, () => new Set()).add(
          edge
        );
      })
    );
  }

  private calculateCoordinateMappings(): void {
    for (let level = 0; level < this.layers.length; ++level) {
      this.updateCoordinateMapping(level);
    }
  }

  work(): void {
    this.calculateReverseShortEdges();
    this.calculateCoordinateMappings();

    this.didUpdate = true;
    let iterationCount = 0;
    while (this.didUpdate && iterationCount < this.settings.maxIterations) {
      this.didUpdate = false;
      this.doIteration();
      ++iterationCount;
    }
  }
}

export class GraphLayoutBuilder {
  private readonly layers: UUID[][] = [];

  private readonly layerMap: Map<UUID, number> = new Map();

  private readonly longEdges: Map<UUID, Set<LongEdge>> = new Map();

  private readonly shortEdges: Map<UUID, Set<ShortEdge>> = new Map();

  constructor(
    private graph: AdjacencyListGraph<unknown, unknown>,
    private settings: GraphLayoutSettings
  ) {}

  private doMinWidthLayering(): void {
    new MinWidthLayeringAlgorithm(
      this.graph,
      this.settings,
      this.layerMap
    ).work();
  }

  private buildLayerLists(): void {
    if (this.layerMap.size === 0) {
      return;
    }

    const layerCount =
      Array.from(this.layerMap.values()).reduce((lhs, rhs) =>
        Math.max(lhs, rhs)
      ) + 1;

    for (let i = 0; i < layerCount; ++i) {
      this.layers.push([]);
    }

    Array.from(this.layerMap.entries()).forEach(([key, value]) => {
      this.layers[value].push(key);
    });
  }

  private createVertex(level: number): UUID {
    const uuid = generateUUID();
    this.layerMap.set(uuid, level);
    this.layers[level].push(uuid);
    return uuid;
  }

  private normalizeEdges(): void {
    Array.from(this.graph.getVertices()).forEach((v) => {
      Array.from(this.graph.getOutgoingEdges(v)).forEach((edge) => {
        const begin = edge.getBegin().getUUID();
        const end = edge.getEnd().getUUID();

        const path = [begin];
        for (
          let level = requireNonNull(this.layerMap.get(begin)) + 1;
          level < requireNonNull(this.layerMap.get(end));
          ++level
        ) {
          const virtualVertex = this.createVertex(level);
          path.push(virtualVertex);
        }
        path.push(end);

        const shortEdges: ShortEdge[] = path
          .slice(1)
          .map((edgeEnd, idx): ShortEdge => {
            const edgeBegin = path[idx];
            return { from: edgeBegin, to: edgeEnd };
          });

        shortEdges.forEach((e) => {
          computeIfAbsent(this.shortEdges, e.from, () => new Set()).add(e);
        });

        computeIfAbsent(this.longEdges, begin, () => new Set()).add({
          shortEdges,
          edgeId: edge.getUUID(),
        });
      });
    });
  }

  private assignLayers(): void {
    this.doMinWidthLayering();
    this.buildLayerLists();
    this.normalizeEdges();
  }

  private minimizeCrossing() {
    new EfficientBarycenterCrossMinimizer(
      this.layers,
      this.layerMap,
      this.shortEdges,
      this.settings.crossMinimizerSettings
    ).work();
  }

  private assignCoordinates(): GraphLayout {
    const maxLayerSize = this.layers.reduce(
      (acc, layer) => Math.max(acc, layer.length),
      0
    );

    const drawingWidth = maxLayerSize * this.settings.minVertexWidth;

    const vertexCoordinates = new Map<UUID, Point2D>();
    this.layers.forEach((layer, layerIndex) => {
      layer.forEach((vertex, coordinate) => {
        vertexCoordinates.set(vertex, {
          x: ((coordinate + 0.5) / layer.length) * drawingWidth,
          y: layerIndex * this.settings.layerHeight,
        });
      });
    });

    const edgeAnchorPoints = new Map<UUID, Point2D[]>();
    this.longEdges.forEach((set) =>
      Array.from(set).forEach((longEdge) => {
        const anchors: Point2D[] = longEdge.shortEdges.map((shortEdge) =>
          requireNonNull(vertexCoordinates.get(shortEdge.from))
        );
        anchors.push(
          requireNonNull(
            vertexCoordinates.get(
              longEdge.shortEdges[longEdge.shortEdges.length - 1].to
            )
          )
        );
        edgeAnchorPoints.set(longEdge.edgeId, anchors);
      })
    );

    return { vertexCoordinates, edgeAnchorPoints };
  }

  build(): GraphLayout {
    // According to the Sugiyama approach, we have 4 steps.
    // 1. Cycle removal
    // No-op: we assume that our graph is acyclic
    // 2. Layer assignment
    this.assignLayers();
    // 3. Crossing minimization
    this.minimizeCrossing();
    // 4. Horizontal coordinate assignment
    return this.assignCoordinates();
  }
}

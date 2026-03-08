import React, { useEffect, useMemo, useRef, useState } from "react";
import { untangle } from "../../library/dataStructures/d3/d3Graph";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { D3Link } from "../../library/dataStructures/d3/d3Link";
import {
  CondensedRetrieval,
  RetrievalGraph,
} from "../../library/dataStructures/json/retrieval";
import { condenseByPartitions } from "../../library/graphProcessors/condenseByPartitions";
import { removeMergerNodes } from "../../library/graphProcessors/removeMergerNodes";
import { InteractiveLink } from "../Graph/InteractiveLink";
import { Node } from "../Graph/Node";
import { Button, ButtonGroup } from "react-bootstrap";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { VertexSelection } from "../../library/dataStructures/processing/selection";
import { buildDefaultSelection } from "../../library/graphProcessors/selection";
import { buildD3 } from "../../library/graphView/jsonToD3Data";
import * as d3 from "d3";
import _ from "lodash";
import { requireNonNull } from "../../library/utilities/util";
import { useWindowSize } from "../../hooks/windowSize";
import { updateGraph } from "../../library/graphView/graphHelpers";
import {
  buildPartitioningColorMap,
  createPartitioningColorFn,
} from "../../library/graphView/partitionColors";
import { D3DragEvent, D3ZoomEvent, ZoomBehavior } from "d3";
import "./Partitions.css";

interface DataModel {
  graph: RetrievalGraph;
  selection: VertexSelection;
  partitioningColorFn: (d: D3Node) => string;
}

/**
 * This React component displays a partition-condensed view of the retrieval graph.
 * Nodes are retained only if their partitioning differs from connected neighbors.
 * Chains of nodes with the same partitioning are condensed into single hexagon nodes.
 *
 * @param attributes - React JSX attributes
 * @param attributes.query - The query to be displayed
 * @param attributes.selection - Subset of retrievals to be displayed
 * @param attributes.changeGraph - Callback for navigation across current pass
 */
export function Partitions({
  query,
  selection: _selection,
  changeGraph: changeGraph0,
}: {
  query: QueryPlan;
  selection: VertexSelection;
  changeGraph: (queryId: number) => void;
}) {
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  // Condense the graph by partitions on mount/query change, then remove merger nodes
  const condensedData = useMemo<DataModel>(() => {
    const { graph: condensedGraph } = condenseByPartitions(query.graph);
    const { graph } = removeMergerNodes(condensedGraph);
    const selection = buildDefaultSelection([graph])[0];
    const colorMap = buildPartitioningColorMap(graph);
    const partitioningColorFn = createPartitioningColorFn(colorMap);
    return { graph, selection, partitioningColorFn };
  }, [query]);

  const windowSize = useWindowSize();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>(undefined);
  const forceRef = useRef<d3.Simulation<D3Node, undefined>>(undefined);

  const clickNode = (id: number | null) => {
    setSelectedLinkId(null); // Clear link selection when clicking a node
    setSelectedNodeId((oldId) => {
      return id === oldId ? null : id;
    });
  };

  const clickLink = (id: string | null) => {
    setSelectedNodeId(null); // Clear node selection when clicking a link
    setSelectedLinkId((oldId) => {
      return id === oldId ? null : id;
    });
  };

  const changeGraph = (id: number) => {
    clickNode(null);
    changeGraph0(id);
  };

  // No-op for condensed retrieval drillthrough in partition view
  const onCondensedRetrievalDrillthrough = (_retrieval: CondensedRetrieval) => {
    // Not supported in partition view
  };

  useEffect(() => {
    if (svgRef.current === null) {
      return;
    }
    if (nodes.length === 0) {
      return;
    }

    const d3Graph = d3.select<SVGSVGElement, unknown>(svgRef.current);

    const setupDragging = (force: d3.Simulation<D3Node, undefined>) => {
      if (svgRef.current === null) {
        return;
      }

      const dragStarted = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node,
      ) => {
        if (!event.active) {
          force.alphaTarget(0.3).restart();
        }
        setSelectedNodeId(null);
        setSelectedLinkId(null);
        d.fx = d.x;
        d.fy = d.y;
      };

      const dragging = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node,
      ) => {
        d.fx = event.x;
        d.fy = event.y;
      };

      const dragEnded = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node,
      ) => {
        if (!event.active) {
          force.alphaTarget(0);
        }

        d.fx = null;
        d.fy = null;
      };

      d3.select(svgRef.current)
        .selectAll<SVGGElement, D3Node>("g.node")
        .call(
          d3
            .drag<SVGGElement, D3Node>()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded),
        );
    };

    const setupForceSimulation = () => {
      const clusters = _(nodes).map((n) => n.clusterId);
      const minC = requireNonNull(clusters.min());
      const maxC = requireNonNull(clusters.max());
      const viewCenter = window.innerWidth / 2;

      const clusterCenter = (minC + maxC) / 2;

      const desiredXPos = (node: D3Node) =>
        viewCenter + ((node.clusterId - clusterCenter) * window.innerWidth) / 2;

      const force = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("link", d3.forceLink(links).distance(150))
        .force(
          "collide",
          d3.forceCollide<D3Node>().radius((d) => d.radius),
        )
        .force("forceY", d3.forceY<D3Node>((d) => d.yFixed).strength(1))
        .force("forceX", d3.forceX(desiredXPos).strength(0.1));

      force.on("tick", () => {
        d3Graph.call(updateGraph);
      });

      return force;
    };

    const force = setupForceSimulation();
    setupDragging(force);
    forceRef.current = force;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setSelectedNodeId(null);
        setSelectedLinkId(null);
        d3Graph.select("g").attr("transform", event.transform.toString());
      });

    d3Graph.call(zoom);
    zoomRef.current = zoom;

    return () => {
      zoomRef.current = undefined;
      forceRef.current = undefined;
      force.stop();
    };
  }, [epoch, nodes, links]);

  useEffect(() => {
    if (svgRef.current === null) {
      return;
    }

    // Build edge selection - include all edges
    const edgeSelection = new Set(
      Array.from(condensedData.graph.getVertices())
        .flatMap((v) => Array.from(condensedData.graph.getOutgoingEdges(v)))
        .map((edge) => ({
          source: edge.getBegin().getUUID(),
          target: edge.getEnd().getUUID(),
        })),
    );

    const d3data = buildD3(
      condensedData.graph,
      condensedData.selection,
      edgeSelection,
    );

    setNodes(d3data.nodes);
    setLinks(d3data.links);
    setEpoch((e) => e + 1);
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  }, [condensedData]);

  const onUntangle = () => {
    untangle({ nodes, links });
    if (forceRef.current !== undefined) {
      forceRef.current.alphaTarget(0.3).restart();
    }
  };

  const zoomScaleBy = (factor: number) => {
    if (svgRef.current === null) {
      return;
    }
    if (zoomRef.current === undefined) {
      return;
    }
    const svg = d3.select(svgRef.current);
    svg.transition().call(zoomRef.current?.scaleBy, factor);
  };

  return (
    <div className="partitions-container">
      <svg
        className="graph partitions-graph"
        ref={svgRef}
        style={{
          width: windowSize.width,
          height: windowSize.height - 56,
        }}
      >
        <g key={`e${epoch}`}>
          {links.map((link) => (
            <InteractiveLink
              link={link}
              key={link.id}
              minCriticalScore={0}
              clickLink={clickLink}
              selected={selectedLinkId === link.id}
            />
          ))}
          {nodes.map((node) => (
            <Node
              node={node}
              changeGraph={changeGraph}
              clickNode={clickNode}
              key={node.id}
              selected={selectedNodeId === node.id}
              onCondensedRetrievalDrillthrough={
                onCondensedRetrievalDrillthrough
              }
              disableClick={true}
              backgroundColorFn={condensedData.partitioningColorFn}
            />
          ))}
        </g>
      </svg>
      <div className="partitions-controls">
        <ButtonGroup>
          <Button onClick={() => zoomScaleBy(2)} variant="secondary">
            Zoom in
          </Button>
          <Button onClick={() => zoomScaleBy(0.5)} variant="secondary">
            Zoom out
          </Button>
        </ButtonGroup>
        <Button onClick={onUntangle} variant="secondary" className="ms-2">
          Untangle
        </Button>
      </div>
    </div>
  );
}

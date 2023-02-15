import FileSaver from "file-saver";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { D3Graph } from "../../library/dataStructures/d3/d3Graph";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { D3Link } from "../../library/dataStructures/d3/d3Link";
import "./Drawer.css";
import { Link } from "./Link";
import { Node } from "./Node";
import { Button, Overlay } from "react-bootstrap";
import { Menu } from "./Menu";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { VertexSelection } from "../../library/dataStructures/processing/selection";
import { Measure } from "../../library/dataStructures/json/measure";
import { filterByMeasures } from "../../library/graphProcessors/selection";
import { buildD3, dumpInDOTFormat } from "../../library/graphView/jsonToD3Data";
import * as d3 from "d3";
import _ from "lodash";
import { requireNonNull } from "../../library/utilities/util";
import { useWindowSize } from "../../hooks/windowSize";
import { updateGraph } from "../../library/graphView/graphHelpers";
import { D3DragEvent, D3ZoomEvent } from "d3";

/**
 * This Reach component is responsible for retrieval graph visualization.
 * <br/>
 * Tasks:
 * * Building an animated SVG for a given Retrievals graph;
 * * Interaction of the graph with the user (zoom, dragging);
 * * Filtering nodes by used _measures_.
 * @param attributes - React JSX attributes
 * @param attributes.query - The query to be displayed
 * @param attributes.selection - Subset of retrievals to be displayed
 * @param attributes.changeGraph - Callback for navigation across current pass
 */
export function Graph({
  query,
  selection,
  changeGraph: changeGraph0,
}: {
  query: QueryPlan;
  selection: VertexSelection;
  changeGraph: (queryId: number) => void;
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedMeasures, setSelectedMeasures] = useState<Measure[]>([]);
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [epoch, setEpoch] = useState(0);

  const windowSize = useWindowSize();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const triggerRef = useRef(null);

  const selectedRetrievals = useMemo(() => {
    if (selectedMeasures.length === 0) {
      return null;
    }
    return filterByMeasures({
      graph: query.graph,
      measures: selectedMeasures,
      selection,
    });
  }, [query, selectedMeasures, selection]);

  useEffect(() => {
    setSelectedMeasures([]);
  }, [query]);

  const addMeasure = (measure: Measure) => {
    if (selectedMeasures.includes(measure)) {
      return;
    }
    setSelectedMeasures([...selectedMeasures, measure]);
  };

  const removeMeasure = (measure: Measure) => {
    setSelectedMeasures(selectedMeasures.filter((m) => m !== measure));
  };

  const selectMeasure = ({
    measure,
    selected,
  }: {
    measure: Measure;
    selected: boolean;
  }) => {
    if (selected) {
      addMeasure(measure);
    } else {
      removeMeasure(measure);
    }
  };

  const clickNode = (id: number | null) => {
    setSelectedNodeId((oldId) => {
      return id === oldId ? null : id;
    });
  };

  const changeGraph = (id: number) => {
    clickNode(null);
    changeGraph0(id);
  };

  useEffect(() => {
    if (svgRef.current === null) {
      return;
    }
    if (nodes.length === 0) {
      return;
    }

    const d3Graph = d3.select<SVGSVGElement, undefined>(svgRef.current);

    const setupDragging = (force: d3.Simulation<D3Node, undefined>) => {
      if (svgRef.current === null) {
        return;
      }

      const dragStarted = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node
      ) => {
        if (!event.active) {
          force.alphaTarget(0.3).restart();
        }
        clickNode(null);
        d.fx = d.x;
        d.fy = d.y;
      };

      const dragging = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node
      ) => {
        d.fx = event.x;
        d.fy = event.y;
      };

      const dragEnded = (
        event: D3DragEvent<SVGGElement, D3Node, unknown>,
        d: D3Node
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
            .on("end", dragEnded)
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
          d3.forceCollide<D3Node>().radius((d) => d.radius)
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

    d3Graph.call(
      d3
        .zoom<SVGSVGElement, undefined>()
        .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
          clickNode(null);
          d3Graph.select("g").attr("transform", event.transform.toString());
        })
    );
  }, [epoch, nodes, links]);

  useEffect(() => {
    if (svgRef.current === null) {
      return;
    }

    const d3data = buildD3(query, selectedRetrievals || selection);

    setNodes(d3data.nodes);
    setLinks(d3data.links);
    setEpoch((e) => e + 1);
  }, [query, selectedRetrievals, selection]);

  const exportAsDOTCallback = () => {
    const d3Graph: D3Graph = { nodes, links };
    const text = dumpInDOTFormat(d3Graph);
    const blob = new Blob([text], { type: "text/plain;charset=utf8" });
    FileSaver.saveAs(blob, "graph.dot");
  };

  return (
    <>
      <svg
        className="graph"
        ref={svgRef}
        style={{
          width: windowSize.width,
          height: windowSize.height - 56,
        }}
      >
        <g key={`e${epoch}`}>
          {links.map((link) => (
            <Link link={link} key={link.id} />
          ))}
          {nodes.map((node) => (
            <Node
              node={node}
              changeGraph={changeGraph}
              clickNode={clickNode}
              key={node.id}
              selected={selectedNodeId === node.id}
            />
          ))}
        </g>
      </svg>
      <Button
        ref={triggerRef}
        className={`drawer-trigger ${showDrawer ? "open" : ""}`}
        variant="info"
        onClick={() => setShowDrawer(!showDrawer)}
      >
        Menu
      </Button>
      <Overlay target={triggerRef.current} placement="left" show={showDrawer}>
        <div className="drawer">
          <Menu
            measures={query.querySummary.measures}
            selectedMeasures={selectedMeasures}
            onSelectedMeasure={selectMeasure}
            exportAsDOTCallback={exportAsDOTCallback}
          />
        </div>
      </Overlay>
    </>
  );
}

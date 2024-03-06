import React, { useEffect, useMemo, useRef, useState } from "react";
import { untangle } from "../../library/dataStructures/d3/d3Graph";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { D3Link } from "../../library/dataStructures/d3/d3Link";
import "./Drawer.css";
import {
  computeEdgeCriticalScore,
  selectCriticalSubgraph,
} from "../../library/graphProcessors/criticalPath";
import { UUID } from "../../library/utilities/uuid";
import { useNotificationContext } from "../Notification/NotificationWrapper";
import {
  CondensedRetrieval,
  RetrievalGraph,
} from "../../library/dataStructures/json/retrieval";
import { condenseFastRetrievals } from "../../library/graphProcessors/condenseFastRetrievals";
import { Link } from "./Link";
import { Node } from "./Node";
import { Button, ButtonGroup, Form, Overlay } from "react-bootstrap";
import { Menu } from "./Menu";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import {
  EdgeSelection,
  VertexSelection,
} from "../../library/dataStructures/processing/selection";
import { Measure } from "../../library/dataStructures/json/measure";
import {
  buildDefaultSelection,
  filterByMeasures,
} from "../../library/graphProcessors/selection";
import { buildD3 } from "../../library/graphView/jsonToD3Data";
import * as d3 from "d3";
import _ from "lodash";
import { requireNonNull } from "../../library/utilities/util";
import { useWindowSize } from "../../hooks/windowSize";
import { updateGraph } from "../../library/graphView/graphHelpers";
import { D3DragEvent, D3ZoomEvent, ZoomBehavior } from "d3";


interface DataModel {
  graph: RetrievalGraph;
  selection: VertexSelection;
}

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
  selection: selection0,
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

  const [condenseFastRetrievalsFlag, setCondenseFastRetrievalsFlag] =
    useState(false);
  const [fastRetrievalMaxElapsedTimeMs, setFastRetrievalMaxElapsedTimeMs] =
    useState(1);
  const [fastRetrievalDrillthough, setFastRetrievalDrillthough] =
    useState<VertexSelection>();
  const originalData = useMemo<DataModel>(
    () => ({
      graph: query.graph,
      selection: selection0,
    }),
    [query, selection0]
  );
  const effectiveData = useMemo(() => {
    let { graph, selection } = originalData;

    if (fastRetrievalDrillthough !== undefined) {
      selection = fastRetrievalDrillthough;
    } else if (condenseFastRetrievalsFlag) {
      graph = condenseFastRetrievals(graph, fastRetrievalMaxElapsedTimeMs);
      computeEdgeCriticalScore(graph);
      selection = buildDefaultSelection([graph])[0];
    }

    return { graph, selection };
  }, [
    originalData,
    condenseFastRetrievalsFlag,
    fastRetrievalMaxElapsedTimeMs,
    fastRetrievalDrillthough,
  ]);
  const onCondensedRetrievalDrillthrough = (retrieval: CondensedRetrieval) => {
    const uuidMap = new Map(
      Array.from(originalData.graph.getVertices()).map((vertex) => [
        vertex.getMetadata(),
        vertex.getUUID(),
      ])
    );

    setFastRetrievalDrillthough(
      new Set(
        retrieval.underlyingRetrievals.map((underlying) =>
          requireNonNull(uuidMap.get(underlying))
        )
      )
    );
  };

  const [minCriticalScore, setMinCriticalScore] = useState(0.7);
  const [selectCriticalSubgraphFlag, setSelectCriticalSubgraphFlag] =
    useState(false);

  const windowSize = useWindowSize();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const triggerRef = useRef(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  const notificationContext = useNotificationContext();

  const [autoCriticalScoreFilterNotified, setAutoCriticalScoreFilterNotified] =
    useState(false);
  useEffect(() => {
    if (
      effectiveData.graph.getVertexCount() >= 100 &&
      !autoCriticalScoreFilterNotified
    ) {
      setSelectCriticalSubgraphFlag(true);
      setAutoCriticalScoreFilterNotified(true);
      notificationContext?.newMessage(
        "Graph filter",
        "Since the retrieval graph is big, the critical score filter is applied. You can configure it in the menu.",
        { bg: "info" }
      );
    }
  }, [effectiveData, notificationContext, autoCriticalScoreFilterNotified]);

  const selectedRetrievals = useMemo(() => {
    if (selectCriticalSubgraphFlag && !fastRetrievalDrillthough) {
      return selectCriticalSubgraph(effectiveData.graph, minCriticalScore);
    }
    if (selectedMeasures.length === 0) {
      return null;
    }
    return filterByMeasures({
      ...effectiveData,
      measures: selectedMeasures,
    });
  }, [
    effectiveData,
    selectedMeasures,
    selectCriticalSubgraphFlag,
    minCriticalScore,
    fastRetrievalDrillthough,
  ]);

  const edgeSelection: EdgeSelection = useMemo(() => {
    return Array.from(effectiveData.graph.getVertices())
      .flatMap((v) => Array.from(effectiveData.graph.getOutgoingEdges(v)))
      .reduce((set, edge) => {
        const sourceUUID = edge.getBegin().getUUID();
        const targetUUID = edge.getEnd().getUUID();
        if (
          !selectCriticalSubgraphFlag ||
          edge.getMetadata().criticalScore >= minCriticalScore
        ) {
          set.add({ source: sourceUUID, target: targetUUID });
        }
        return set;
      }, new Set<{ source: UUID; target: UUID }>());
  }, [effectiveData, selectCriticalSubgraphFlag, minCriticalScore]);

  useEffect(() => {
    setSelectedMeasures([]);
  }, [effectiveData]);

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

  const forceRef = useRef<d3.Simulation<D3Node, undefined>>();

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
    forceRef.current = force;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        clickNode(null);
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

    const d3data = buildD3(
      effectiveData.graph,
      selectedRetrievals || effectiveData.selection,
      edgeSelection
    );

    setNodes(d3data.nodes);
    setLinks(d3data.links);
    setEpoch((e) => e + 1);
    clickNode(null);
  }, [effectiveData, selectedRetrievals, edgeSelection]);

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
            <Link
              link={link}
              key={link.id}
              minCriticalScore={
                selectCriticalSubgraphFlag ? minCriticalScore : 0
              }
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
          >
            <ButtonGroup>
              <Button onClick={() => zoomScaleBy(2)}>Zoom in</Button>
              <Button onClick={() => zoomScaleBy(0.5)}>Zoom out</Button>
            </ButtonGroup>
            <Button onClick={onUntangle}>Untangle</Button>
            <h5>Fast retrieval condensation</h5>
            <Form>
              <Form.Check
                type="switch"
                checked={condenseFastRetrievalsFlag}
                onChange={(e) =>
                  setCondenseFastRetrievalsFlag(e.target.checked)
                }
                label="Apply condensation"
              />
              <Form.Label>
                Max elapsed time: {fastRetrievalMaxElapsedTimeMs}&nbsp;ms
              </Form.Label>
              <Form.Range
                min={0}
                max={20}
                step={1}
                value={fastRetrievalMaxElapsedTimeMs}
                onChange={(e) =>
                  setFastRetrievalMaxElapsedTimeMs(+e.target.value)
                }
              />
              {fastRetrievalDrillthough && (
                <Button onClick={() => setFastRetrievalDrillthough(undefined)}>
                  Zoom out
                </Button>
              )}
            </Form>
            <h5>Critical score filter</h5>
            <Form>
              <Form.Check
                type="switch"
                checked={selectCriticalSubgraphFlag}
                onChange={(e) =>
                  setSelectCriticalSubgraphFlag(e.target.checked)
                }
                label="Enable filter"
                disabled={Boolean(fastRetrievalDrillthough)}
              />
              {selectCriticalSubgraphFlag && (
                <>
                  <Form.Label>
                    Minimal score: {minCriticalScore.toFixed(3)}
                  </Form.Label>
                  <Form.Range
                    min={0}
                    max={1}
                    step="any"
                    value={minCriticalScore}
                    onChange={(e) => setMinCriticalScore(+e.target.value)}
                  ></Form.Range>
                </>
              )}
            </Form>
          </Menu>
        </div>
      </Overlay>
    </>
  );
}

import React, { Component } from "react";
import ReactDOM from "react-dom";
import Overlay from "react-bootstrap/Overlay";
import * as d3 from "d3";
import _ from "lodash";
import Button from "react-bootstrap/Button";
import Link from "./Link";
import Node from "./Node";
import Menu from "./Menu";
import { updateGraph } from "../../library/graphView/graphHelpers";
import { buildD3 } from "../../library/graphView/jsonToD3Data";
import { filterByMeasures } from "../../library/graphProcessors/selection";
import "./Drawer.css";

class Graph extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDrawer: false,
      selectedMeasures: [],
      selectedRetrievals: null,
      nodes: [],
      links: [],
      selectedNodeId: null,
      // This is a tricky to force the graph to rebuild after a new graph is generated
      epoch: 0,
    };
    this.svgRef = React.createRef();
    this.triggerRef = React.createRef();
  }

  componentDidMount() {
    this.generateGraph();
  }

  componentWillUnmount() {
    // eslint-disable-next-line react/prop-types
    this.props.restart();
  }

  clickNode = (id) => {
    this.setState((prevState) => {
      const selectedNodeId = id === prevState.selectedNodeId ? null : id;
      const { nodes } = prevState;
      nodes.forEach((node) => {
        if (node.id === id) {
          node.isSelected = node.isSelected !== true;
        } else {
          node.isSelected = false;
        }
      });
      return { selectedNodeId, nodes };
    });
  };

  changeGraph = (...args) => {
    this.clickNode(null); // Unselect the current node( this. should be move to upated props)
    // eslint-disable-next-line react/prop-types
    this.props.changeGraph(...args);
  };

  toggleDrawer = () => {
    this.setState(({ showDrawer }) => ({ showDrawer: showDrawer !== true }));
  };

  selectMeasure = ({ measure, selected }) => {
    this.setState(
      ({ selectedMeasures }) => {
        if (selected) {
          if (selectedMeasures.includes(measure)) {
            return {};
          }
          const newSelection = [...selectedMeasures, measure];
          return {
            selectedMeasures: newSelection,
            selectedRetrievals: filterByMeasures({
              // eslint-disable-next-line react/prop-types
              graph: this.props.query.graph,
              measures: newSelection,
              // eslint-disable-next-line react/prop-types
              selection: this.props.selection,
            }),
          };
        }

        const newSelection = selectedMeasures.filter((m) => m !== measure);
        return {
          selectedMeasures: newSelection,
          selectedRetrievals:
            newSelection.length === 0
              ? null
              : filterByMeasures({
                  // eslint-disable-next-line react/prop-types
                  graph: this.props.query.graph,
                  measures: newSelection,
                  // eslint-disable-next-line react/prop-types
                  selection: this.props.selection,
                }),
        };
      },
      () => this.generateGraph()
    );
  };

  generateGraph() {
    // eslint-disable-next-line react/prop-types
    const { query, selection } = this.props;
    const { selectedRetrievals, epoch } = this.state;
    if (query === undefined) return;

    const { nodes, links } = buildD3(query, selectedRetrievals || selection);

    const d3Graph = d3
      .select(ReactDOM.findDOMNode(this))
      .attr("width", window.innerWidth)
      .attr("height", window.innerHeight - 56);

    const clusters = _(nodes).map((n) => n.clusterId);
    const minC = clusters.min();
    const maxC = clusters.max();
    const viewCenter = window.innerWidth / 2;
    const clusterCenter = (minC + maxC) / 2;

    const desiredXPos = (node) =>
      viewCenter + ((node.clusterId - clusterCenter) * window.innerWidth) / 2;

    const force = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("link", d3.forceLink(links).distance(150))
      .force(
        "collide",
        d3.forceCollide().radius((d) => d.radius)
      )
      .force("forceY", d3.forceY((d) => d.yFixed).strength(1))
      .force("forceX", d3.forceX(desiredXPos).strength(0.1));

    function dragStarted(d) {
      if (!d3.event.active) force.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragEnded(d) {
      if (!d3.event.active) force.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    d3.select(window).on("resize", () => {
      d3Graph
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight - 56);
    });

    d3Graph.call(
      d3.zoom().on("zoom", () => {
        this.clickNode(null);
        return d3
          .select("svg")
          .select("g")
          .attr("transform", d3.event.transform);
      })
    );

    force.on("tick", () => {
      d3Graph.call(updateGraph);
    });

    this.setState({ nodes, links, epoch: epoch + 1 }, () => {
      d3Graph
        .selectAll("g.node")
        .call(
          d3
            .drag()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded)
        );
    });
  }

  render() {
    const { nodes, links } = this.state;
    const Nodes = nodes.map((node) => (
      <Node
        node={node}
        key={node.id}
        clickNode={this.clickNode}
        changeGraph={this.changeGraph}
      />
    ));
    const Links = links.map((link) => (
      <Link key={link.id} link={link} href="/" />
    ));

    return (
      <>
        <svg className="graph" ref={this.svgRef}>
          <g key={`e${this.state.epoch}`}>
            {Links}
            {Nodes}
          </g>
        </svg>
        <Button
          ref={this.triggerRef}
          className={`drawer-trigger ${this.state.showDrawer ? "open" : ""}`}
          variant="outline-dark"
          onClick={this.toggleDrawer}
        >
          Menu
        </Button>
        <Overlay
          show={this.state.showDrawer}
          placement="left"
          target={this.triggerRef.current}
        >
          <div className="drawer">
            <Menu
              measures={
                this.props.query /* eslint-disable-line react/prop-types */
                  .querySummary /* eslint-disable-line react/prop-types */
                  .measures /* eslint-disable-line react/prop-types */
              }
              selectedMeasures={this.state.selectedMeasures}
              onSelectedMeasure={this.selectMeasure}
            />
          </div>
        </Overlay>
      </>
    );
    // FIXME remove the extra space taken by the button
  }
}

export default Graph;

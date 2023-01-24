import React, {
  CSSProperties,
  ForwardedRef,
  forwardRef,
  useLayoutEffect,
  useRef,
} from "react";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { Popover, Button, Overlay } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import { Details } from "components/Details/Details";
import { enterNode, updateNode } from "../../library/graphView/graphHelpers";
import * as d3 from "d3";
import { useOverlayContainer } from "../../hooks/overlayContainer";
import "./Node.css";

const POPOVER_BACKGROUND_COLOR = "#DDDDDD";

/**
 * This React component is responsible for displaying pop-over window with
 * information about retrieval when clicking graph nodes.
 *
 * @param props - React JSX attributes
 * @param props.node - Selected graph node
 * @param props.changeGraph - Callback for navigation across current pass
 * @param props.clickNode - Callback for closing current pop-over
 * @param props.nodeRef - Reference to the SVG DOM element; needed for
 * window positioning
 * */
const NodePopover = forwardRef(function NodePopover(
  {
    node,
    clickNode,
    nodeRef,
    changeGraph,
  }: {
    node: D3Node;
    changeGraph: (childId: number) => void;
    clickNode: (id: number | null) => void;
    nodeRef: SVGElement | null;
  },
  ref: ForwardedRef<HTMLDivElement>
) {
  const { details } = node;
  const { startTimes, elapsedTimes, metadata } = details;
  const { type } = metadata;
  const fullName = `${metadata.$kind}#${metadata.retrievalId}`;

  let childrenIds: number[];
  if ("childrenIds" in metadata) {
    childrenIds = (metadata.childrenIds || []) as number[];
  } else {
    childrenIds = [];
  }

  const arrowRef = useRef<HTMLElement | null>(null);

  return (
    <Popover
      ref={ref}
      style={{
        maxWidth: "800px",
        pointerEvents: "auto",
        position: "absolute",
        top: nodeRef?.getBoundingClientRect().top,
        left:
          (nodeRef?.getBoundingClientRect().right || 0) +
          (arrowRef.current?.getBoundingClientRect().width || 0),
        transform: "translateY(-50%)",
      }}
      arrowProps={{
        ref: (newRef: HTMLElement | null) => {
          arrowRef.current = newRef;
        },
        style: {
          position: "absolute",
          top: "50%",
          "--bs-popover-bg": POPOVER_BACKGROUND_COLOR,
          transform: `translateY(${
            (nodeRef?.getBoundingClientRect().height || 0) / 2
          }px) translateY(-50%)`,
        } as CSSProperties,
      }}
    >
      <Popover.Header>
        <div className="d-flex">
          <span>{`${type} (${fullName})`}</span>
          <Button
            variant="outline-danger"
            className="ms-auto py-0"
            size="sm"
            aria-label="Close"
            onClick={() => clickNode(null)}
          >
            <FaTimes fontSize="small" />
          </Button>
        </div>
      </Popover.Header>
      <Popover.Body style={{ backgroundColor: POPOVER_BACKGROUND_COLOR }}>
        <Details
          startTime={startTimes}
          elapsedTime={elapsedTimes}
          metadata={metadata}
        />
        {childrenIds
          ? childrenIds.map((childId) => (
              <>
                <button
                  key={childId}
                  type="button"
                  className="btn btn-primary"
                  onClick={() => changeGraph(childId)}
                >
                  Enter sub-query {childId}.
                </button>{" "}
              </>
            ))
          : null}
      </Popover.Body>
    </Popover>
  );
});

/**
 * Filter out `null` values and join class names using space as a delimiter.
 * */
function computeClasses(classNames: (string | null)[]) {
  return classNames.filter((className) => className !== null).join(" ");
}

/**
 * This React component is responsible for graph vertex visualization.
 *
 * @param attributes - React JSX attributes
 * @param attributes.node - Graph node to be displayed
 * @param attributes.changeGraph - Callback for navigation across current pass
 * @param attributes.clickNode - Callback for node selection
 * @param attributes.selected - If `true`, this node is selected
 */
export function Node({
  node,
  changeGraph,
  clickNode,
  selected,
}: {
  node: D3Node;
  changeGraph: (childId: number) => void;
  clickNode: (id: number | null) => void;
  selected: boolean;
}) {
  const ref = useRef<SVGGElement>(null);

  const onClick = () => clickNode(node.id);
  const nodeElem = node.status === "leaf" ? "rect" : "circle";

  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }
    d3.select(ref.current).datum(node).call(enterNode);
  }, [node]);

  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }
    d3.select(ref.current).datum(node).call(updateNode);
  });

  return (
    <>
      <g
        className={computeClasses(["node", selected ? "selected" : null])}
        ref={ref}
      >
        {React.createElement(nodeElem, {
          onClick,
        })}
        <text onClick={onClick}>{node.name}</text>
      </g>
      <Overlay
        container={useOverlayContainer()}
        target={ref.current}
        show={selected}
        placement="right"
      >
        <NodePopover
          changeGraph={changeGraph}
          clickNode={clickNode}
          node={node}
          nodeRef={ref.current}
        />
      </Overlay>
    </>
  );
}

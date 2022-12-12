import React, {
  CSSProperties,
  forwardRef,
  useLayoutEffect,
  useRef,
} from "react";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { Popover } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import { FaTimes } from "react-icons/fa";
import { Details } from "../Details/Details";
import { enterNode, updateNode } from "../../library/graphView/graphHelpers";
import * as d3 from "d3";
import Overlay from "react-bootstrap/Overlay";
import { useOverlayContainer } from "../../hooks/overlayContainer";
import "./Node.css";

const POPOVER_BACKGROUND_COLOR = "#DDDDDD";

const NodePopover = forwardRef<
  HTMLDivElement,
  {
    node: D3Node;
    changeGraph: (childId: number) => void;
    clickNode: (id: number | null) => void;
    nodeRef: SVGElement | null;
  }
>((props, ref) => {
  const { node, clickNode, changeGraph, nodeRef } = props;

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
      ref={ref}
      arrowProps={{
        ref: (newRef) => {
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

function computeClasses(classNames: (string | null)[]) {
  return classNames.filter((className) => className !== null).join(" ");
}

/**
 * This React component is responsible for graph vertex visualization.
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
    //.style("stroke-width", node.isSelected ? 2 : 0);
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

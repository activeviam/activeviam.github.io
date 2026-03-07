import React, { useLayoutEffect, useRef } from "react";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { CondensedRetrievalKind } from "../../library/dataStructures/json/retrieval";
import { enterNode, updateNode } from "../../library/graphView/graphHelpers";
import * as d3 from "d3";
import "./Node.css";

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
 * @param attributes.clickNode - Callback for node selection
 * @param attributes.selected - If `true`, this node is selected
 */
export function Node({
  node,
  clickNode,
  selected,
}: {
  node: D3Node;
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
    <g
      className={computeClasses([
        "node",
        selected ? "selected" : null,
        node.details.metadata.$kind === CondensedRetrievalKind
          ? "condensed"
          : null,
      ])}
      ref={ref}
    >
      {React.createElement(nodeElem, {
        onClick,
      })}
      <text onClick={onClick}>{node.name}</text>
    </g>
  );
}

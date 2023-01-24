import * as PropTypes from "prop-types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Graphviz } from "@hpcc-js/wasm/graphviz";
import {
  dumpMetadata,
  QueryPlanMetadataPropType,
} from "../../library/graphProcessors/extractMetadata";

function useGraphviz() {
  const [graphviz, setGraphviz] = useState(null);
  useEffect(() => {
    (async () => {
      setGraphviz(await Graphviz.load());
    })();
  }, []);

  return graphviz;
}

/**
 * This React component renders graphs using @hpcc-js GraphViz implementation.
 */
function GraphViz({ dot }) {
  const graphviz = useGraphviz();
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current === null) {
      return;
    }
    if (graphviz === null) {
      return;
    }

    ref.current.innerHTML = graphviz.layout(dot, "svg", "dot");
    ref.current.children[0].setAttribute("width", "100%");
    ref.current.children[0].setAttribute("height", "100%");
  }, [ref, dot, graphviz]);

  return <div ref={ref}></div>;
}

GraphViz.propTypes = {
  dot: PropTypes.string.isRequired,
};

/**
 * This React component shows passes info.
 * @param {{metadata: QueryPlanMetadata[] }} attributes - React JSX attributes
 * @param {QueryPlanMetadata[]} attributes.metadata - query plan metadata
 * */
export function PassGraph({ metadata }) {
  const dot = useMemo(() => dumpMetadata(metadata), [metadata]);
  return <GraphViz dot={dot}></GraphViz>;
}

PassGraph.propTypes = {
  metadata: PropTypes.arrayOf(QueryPlanMetadataPropType),
};

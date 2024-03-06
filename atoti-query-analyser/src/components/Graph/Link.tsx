import * as d3 from "d3";
import React, { useLayoutEffect, useRef } from "react";
import { enterLink, updateLink } from "../../library/graphView/graphHelpers";
import { D3Link } from "../../library/dataStructures/d3/d3Link";

/**
 * This React component is responsible for visual representation of an edge of
 * the graph.
 */
export function Link({
  link,
  minCriticalScore,
}: {
  link: D3Link;
  minCriticalScore: number;
}) {
  const ref = useRef<SVGLineElement>(null);

  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }
    d3.select(ref.current).datum(link).call(enterLink, minCriticalScore);
  }, [link, minCriticalScore]);

  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }
    d3.select(ref.current).datum(link).call(updateLink);
  });

  return <line ref={ref} className="link" />;
}

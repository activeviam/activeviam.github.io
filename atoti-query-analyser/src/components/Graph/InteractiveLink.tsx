import React, {
  CSSProperties,
  ForwardedRef,
  forwardRef,
  useLayoutEffect,
  useRef,
} from "react";
import * as d3 from "d3";
import { Popover, Button, Overlay } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import { D3Link } from "../../library/dataStructures/d3/d3Link";
import { ARetrieval } from "../../library/dataStructures/json/retrieval";
import { Details } from "../Details/Details";
import { useOverlayContainer } from "../../hooks/overlayContainer";
import { enterLink, updateLink } from "../../library/graphView/graphHelpers";

const POPOVER_BACKGROUND_COLOR = "#DDDDDD";
const MERGER_LINK_COLOR = "#9932CC";

/**
 * Popover component for displaying hidden merger information.
 */
const MergerPopover = forwardRef(function MergerPopover(
  {
    merger,
    clickLink,
    linkRef,
  }: {
    merger: ARetrieval;
    clickLink: (id: string | null) => void;
    linkRef: SVGGElement | null;
  },
  ref: ForwardedRef<HTMLDivElement>,
) {
  const { timingInfo } = merger;
  const fullName = `${merger.$kind}#${merger.retrievalId}`;
  const startTimes = timingInfo.startTime || [0];
  const elapsedTimes = timingInfo.elapsedTime || [0];

  const arrowRef = useRef<HTMLElement | null>(null);

  // Get the center of the link for positioning
  const linkRect = linkRef?.getBoundingClientRect();
  const centerY = linkRect ? linkRect.top + linkRect.height / 2 : 0;
  const rightX = linkRect
    ? linkRect.right + (arrowRef.current?.getBoundingClientRect().width || 0)
    : 0;

  return (
    <Popover
      ref={ref}
      style={{
        maxWidth: "800px",
        pointerEvents: "auto",
        position: "absolute",
        top: centerY,
        left: rightX,
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
          transform: "translateY(-50%)",
        } as CSSProperties,
      }}
    >
      <Popover.Header>
        <div className="d-flex">
          <span>{`${merger.type} (${fullName})`}</span>
          <Button
            variant="outline-danger"
            className="ms-auto py-0"
            size="sm"
            aria-label="Close"
            onClick={() => clickLink(null)}
          >
            <FaTimes fontSize="small" />
          </Button>
        </div>
      </Popover.Header>
      <Popover.Body style={{ backgroundColor: POPOVER_BACKGROUND_COLOR }}>
        <p className="text-muted mb-2">
          <em>This merger node has been hidden from the view.</em>
        </p>
        <Details
          startTime={startTimes}
          elapsedTime={elapsedTimes}
          metadata={merger}
        />
      </Popover.Body>
    </Popover>
  );
});

/**
 * This React component renders an interactive link that can display
 * hidden merger information on click.
 */
export function InteractiveLink({
  link,
  minCriticalScore,
  clickLink,
  selected,
}: {
  link: D3Link;
  minCriticalScore: number;
  clickLink: (id: string | null) => void;
  selected: boolean;
}) {
  const ref = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const overlayContainer = useOverlayContainer();

  const hasMerger = link.hiddenMerger !== undefined;

  useLayoutEffect(() => {
    if (lineRef.current === null) {
      return;
    }
    const selection = d3.select(lineRef.current).datum(link);
    selection.call(enterLink, minCriticalScore);

    // Apply merger-specific styling
    if (hasMerger) {
      selection
        .style("stroke", MERGER_LINK_COLOR)
        .attr("stroke-dasharray", "8 4");
    }
  }, [link, minCriticalScore, hasMerger]);

  useLayoutEffect(() => {
    if (lineRef.current === null) {
      return;
    }
    d3.select(lineRef.current).datum(link).call(updateLink);
  });

  const onClick = hasMerger
    ? () => clickLink(selected ? null : link.id)
    : undefined;

  return (
    <>
      <g
        ref={ref}
        className={`link-group ${hasMerger ? "has-merger" : ""} ${selected ? "selected" : ""}`}
      >
        {/* Invisible hit area for easier clicking */}
        {hasMerger && (
          <line
            className="link-hit-area"
            x1={link.source.x || 0}
            y1={link.source.y || 0}
            x2={link.target.x || 0}
            y2={link.target.y || 0}
            stroke="transparent"
            strokeWidth={20}
            style={{ cursor: "pointer" }}
            onClick={onClick}
          />
        )}
        <line
          ref={lineRef}
          className="link"
          onClick={onClick}
          style={hasMerger ? { cursor: "pointer" } : undefined}
        />
      </g>
      {hasMerger && (
        <Overlay
          container={overlayContainer}
          target={ref.current}
          show={selected}
          placement="right"
        >
          <MergerPopover
            merger={link.hiddenMerger!}
            clickLink={clickLink}
            linkRef={ref.current}
          />
        </Overlay>
      )}
    </>
  );
}

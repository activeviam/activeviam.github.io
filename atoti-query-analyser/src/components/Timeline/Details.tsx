import React from "react";
import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { Toast } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { Details } from "components/Details/Details";
import { requireNonNull } from "../../library/utilities/util";
import * as labels from "../../library/graphView/labels";
import {
  FocusControl,
  RetrievalCursor,
  areEqualCursors,
  focusOnItem,
  unfocusOnItem,
} from "./Model";
import "./Timeline.css";

/**
 * Meta-component displaying the details for selected elements..
 */
export function TimelineDetails({
  plan,
  focus: { item: focusedItem, showParents, showChildren },
  selection,
  setSelection,
  setFocused,
}: Readonly<{
  plan: QueryPlan;
  focus: FocusControl;
  selection: RetrievalCursor[];
  setSelection: (
    setter: (entries: RetrievalCursor[]) => RetrievalCursor[]
  ) => void;
  setFocused: (setter: (focus: FocusControl) => FocusControl) => void;
}>) {
  const closeBox = (retrieval: RetrievalCursor) => {
    setSelection((entries) => {
      return entries.filter((item) => !areEqualCursors(retrieval, item));
    });
    setFocused((state) => unfocusOnItem(state, retrieval));
  };

  return (
    <div className="timeline-details">
      <div className="d-flex">
        {selection.map((key) => {
          const { id, partition } = key;
          const node = plan.graph.getVertexByUUID(id);

          const metadata = node.getMetadata();
          const kind = metadata.$kind;
          const retrievalId = metadata.retrievalId;
          const type = "type" in metadata ? (metadata.type as string) : kind;
          const timingInfo = metadata.timingInfo;
          const isFocused = areEqualCursors(focusedItem, key);
          const buttonProps = isFocused
            ? { variant: "warning", disabled: true }
            : { variant: "outline-warning" };

          return (
            <Toast
              key={`${id}#${partition}`}
              className="entry"
              onClose={() => closeBox(key)}
            >
              <Toast.Header>
                <span className="retrieval-id mr-auto">
                  #{retrievalId}[{partition}]
                </span>
                &nbsp;
                <span className="retrieval-type">{labels.type(type)}</span>
                <ButtonGroup
                  aria-label="Focus history"
                  size="sm"
                  style={{ marginLeft: 5 }}
                >
                  <Button
                    variant={
                      isFocused && showParents
                        ? "secondary"
                        : "outline-secondary"
                    }
                    disabled={!isFocused}
                    onClick={() =>
                      setFocused((state) => ({
                        ...state,
                        showParents: !state.showParents,
                      }))
                    }
                  >
                    {"<"}
                  </Button>
                  <Button
                    {...buttonProps}
                    onClick={() => {
                      setFocused((state) => focusOnItem(state, key));
                    }}
                  >
                    Focus
                  </Button>
                  <Button
                    variant={
                      isFocused && showChildren
                        ? "secondary"
                        : "outline-secondary"
                    }
                    disabled={!isFocused}
                    onClick={() =>
                      setFocused((state) => ({
                        ...state,
                        showChildren: !state.showChildren,
                      }))
                    }
                  >
                    {">"}
                  </Button>
                </ButtonGroup>
              </Toast.Header>
              <Toast.Body className="body">
                {Details({
                  metadata,
                  startTime: requireNonNull(timingInfo.startTime),
                  elapsedTime: requireNonNull(timingInfo.elapsedTime),
                  partition,
                })}
              </Toast.Body>
            </Toast>
          );
        })}
      </div>
    </div>
  );
}

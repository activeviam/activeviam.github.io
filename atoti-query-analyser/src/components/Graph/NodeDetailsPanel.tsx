import React, { useRef } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { FaThumbtack, FaTimes } from "react-icons/fa";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import { Details } from "../Details/Details";
import {
  CondensedRetrieval,
  CondensedRetrievalKind,
} from "../../library/dataStructures/json/retrieval";
import { type as typeLabel } from "../../library/graphView/labels";
import { ComparisonState } from "./NodeComparisonPanel";
import "./NodeDetailsPanel.css";

export interface NodeDetailsState {
  currentNodeId: number | null;
  pinnedNodeIds: number[];
  expandedNodeIds: Set<number>;
}

export const MAX_PINNED_NODES = 10;

export const initialNodeDetailsState: NodeDetailsState = {
  currentNodeId: null,
  pinnedNodeIds: [],
  expandedNodeIds: new Set(),
};

interface NodeDetailsPanelProps {
  nodes: D3Node[];
  state: NodeDetailsState;
  setState: (fn: (prev: NodeDetailsState) => NodeDetailsState) => void;
  onCenterNode: (nodeId: number) => void;
  changeGraph: (queryId: number) => void;
  onCondensedRetrievalDrillthrough: (retrieval: CondensedRetrieval) => void;
  comparisonState: ComparisonState;
  setComparisonState: React.Dispatch<React.SetStateAction<ComparisonState>>;
}

function getNodeLabel(node: D3Node): string {
  const { metadata } = node.details;
  const elapsed = Math.max(...node.details.elapsedTimes);
  return `${typeLabel(metadata.type)} #${metadata.retrievalId} (${elapsed}ms)`;
}

function NodeAccordionItem({
  node,
  isPinned,
  isExpanded,
  canPin,
  onPin,
  onUnpin,
  onToggleExpand,
  onHeaderClick,
  changeGraph,
  onCondensedRetrievalDrillthrough,
  isLeftNode,
  isRightNode,
  onToggleLeftNode,
  onToggleRightNode,
}: {
  node: D3Node;
  isPinned: boolean;
  isExpanded: boolean;
  canPin: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onToggleExpand: () => void;
  onHeaderClick: () => void;
  changeGraph: (queryId: number) => void;
  onCondensedRetrievalDrillthrough: (retrieval: CondensedRetrieval) => void;
  isLeftNode: boolean;
  isRightNode: boolean;
  onToggleLeftNode: () => void;
  onToggleRightNode: () => void;
}) {
  const { details } = node;
  const { startTimes, elapsedTimes, metadata } = details;

  let childrenIds: number[] = [];
  if ("childrenIds" in metadata) {
    childrenIds = (metadata.childrenIds || []) as number[];
  }

  return (
    <div className="node-details-item">
      <div
        className="node-details-header"
        onClick={() => {
          onHeaderClick();
          onToggleExpand();
        }}
      >
        <span className="node-details-expand-icon">
          {isExpanded ? "▼" : "►"}
        </span>
        <span className="node-details-label">{getNodeLabel(node)}</span>
        <Button
          variant="link"
          size="sm"
          className="node-details-pin-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (isPinned) {
              onUnpin();
            } else {
              onPin();
            }
          }}
          title={isPinned ? "Unpin" : canPin ? "Pin" : "Max 10 pinned nodes"}
          disabled={!isPinned && !canPin}
        >
          {isPinned ? <FaTimes /> : <FaThumbtack />}
        </Button>
        <ButtonGroup size="sm" className="comparison-buttons">
          <Button
            variant={isLeftNode ? "warning" : "outline-warning"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLeftNode();
            }}
            title="Set as left comparison node"
          >
            Left
          </Button>
          <Button
            variant={isRightNode ? "primary" : "outline-primary"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleRightNode();
            }}
            title="Set as right comparison node"
          >
            Right
          </Button>
        </ButtonGroup>
      </div>
      {isExpanded && (
        <div className="node-details-body">
          <Details
            startTime={startTimes}
            elapsedTime={elapsedTimes}
            metadata={metadata}
          />
          {metadata.$kind === CondensedRetrievalKind && (
            <Button
              size="sm"
              onClick={() =>
                onCondensedRetrievalDrillthrough(metadata as CondensedRetrieval)
              }
            >
              Zoom in
            </Button>
          )}
          {childrenIds.map((childId) => (
            <Button
              key={childId}
              size="sm"
              variant="primary"
              className="me-1 mt-1"
              onClick={() => changeGraph(childId)}
            >
              Enter sub-query {childId}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NodeDetailsPanel({
  nodes,
  state,
  setState,
  onCenterNode,
  changeGraph,
  onCondensedRetrievalDrillthrough,
  comparisonState,
  setComparisonState,
}: NodeDetailsPanelProps) {
  const currentNodeRef = useRef<HTMLDivElement>(null);

  const currentNode =
    state.currentNodeId !== null
      ? nodes.find((n) => n.id === state.currentNodeId)
      : null;

  const pinnedNodes = state.pinnedNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is D3Node => n !== undefined);

  const canPin = state.pinnedNodeIds.length < MAX_PINNED_NODES;

  const pinNodeIfNeeded = (nodeId: number) => {
    setState((prevState) => {
      // Already pinned, no change needed
      if (prevState.pinnedNodeIds.includes(nodeId)) {
        return prevState;
      }
      // Can't pin more
      if (prevState.pinnedNodeIds.length >= MAX_PINNED_NODES) {
        return prevState;
      }
      return {
        ...prevState,
        currentNodeId:
          prevState.currentNodeId === nodeId ? null : prevState.currentNodeId,
        pinnedNodeIds: [nodeId, ...prevState.pinnedNodeIds],
        expandedNodeIds: new Set([...prevState.expandedNodeIds, nodeId]),
      };
    });
  };

  const toggleLeftNode = (nodeId: number) => {
    const isSelecting = comparisonState.leftNodeId !== nodeId;
    if (isSelecting) {
      pinNodeIfNeeded(nodeId);
    }
    setComparisonState((prev) => ({
      ...prev,
      leftNodeId: isSelecting ? nodeId : null,
    }));
  };

  const toggleRightNode = (nodeId: number) => {
    const isSelecting = comparisonState.rightNodeId !== nodeId;
    if (isSelecting) {
      pinNodeIfNeeded(nodeId);
    }
    setComparisonState((prev) => ({
      ...prev,
      rightNodeId: isSelecting ? nodeId : null,
    }));
  };

  const handlePin = (nodeId: number) => {
    setState((prev) => ({
      ...prev,
      currentNodeId: null,
      pinnedNodeIds: [nodeId, ...prev.pinnedNodeIds],
      expandedNodeIds: new Set([...prev.expandedNodeIds, nodeId]),
    }));
  };

  const handleUnpin = (nodeId: number) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedNodeIds);
      newExpanded.delete(nodeId);
      return {
        ...prev,
        pinnedNodeIds: prev.pinnedNodeIds.filter((id) => id !== nodeId),
        expandedNodeIds: newExpanded,
      };
    });
  };

  const handleToggleExpand = (nodeId: number) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedNodeIds);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return {
        ...prev,
        expandedNodeIds: newExpanded,
      };
    });
  };

  const handleHeaderClick = (nodeId: number) => {
    onCenterNode(nodeId);
  };

  // Scroll pinned item into view when clicking a pinned node in the graph
  const scrollToPinnedRef = useRef<HTMLDivElement>(null);

  if (!currentNode && pinnedNodes.length === 0) {
    return (
      <div className="node-details-empty">
        Click a node in the graph to see its details here.
      </div>
    );
  }

  return (
    <div className="node-details-panel">
      {currentNode && (
        <div ref={currentNodeRef} className="node-details-current">
          <NodeAccordionItem
            node={currentNode}
            isPinned={false}
            isExpanded={state.expandedNodeIds.has(currentNode.id)}
            canPin={canPin}
            onPin={() => handlePin(currentNode.id)}
            onUnpin={() => {}}
            onToggleExpand={() => handleToggleExpand(currentNode.id)}
            onHeaderClick={() => handleHeaderClick(currentNode.id)}
            changeGraph={changeGraph}
            onCondensedRetrievalDrillthrough={onCondensedRetrievalDrillthrough}
            isLeftNode={comparisonState.leftNodeId === currentNode.id}
            isRightNode={comparisonState.rightNodeId === currentNode.id}
            onToggleLeftNode={() => toggleLeftNode(currentNode.id)}
            onToggleRightNode={() => toggleRightNode(currentNode.id)}
          />
        </div>
      )}
      {pinnedNodes.length > 0 && (
        <div className="node-details-pinned">
          {currentNode && (
            <div className="node-details-pinned-divider">Pinned</div>
          )}
          {pinnedNodes.map((node, index) => (
            <div
              key={node.id}
              ref={index === 0 ? scrollToPinnedRef : undefined}
            >
              <NodeAccordionItem
                node={node}
                isPinned={true}
                isExpanded={state.expandedNodeIds.has(node.id)}
                canPin={canPin}
                onPin={() => {}}
                onUnpin={() => handleUnpin(node.id)}
                onToggleExpand={() => handleToggleExpand(node.id)}
                onHeaderClick={() => handleHeaderClick(node.id)}
                changeGraph={changeGraph}
                onCondensedRetrievalDrillthrough={
                  onCondensedRetrievalDrillthrough
                }
                isLeftNode={comparisonState.leftNodeId === node.id}
                isRightNode={comparisonState.rightNodeId === node.id}
                onToggleLeftNode={() => toggleLeftNode(node.id)}
                onToggleRightNode={() => toggleRightNode(node.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

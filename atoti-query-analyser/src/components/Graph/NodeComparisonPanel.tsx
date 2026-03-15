import React from "react";
import { Form } from "react-bootstrap";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import {
  compareNodes,
  ArrayDiffItem,
  LocationDiffItem,
  LevelDiffItem,
  ScalarDiffResult,
  DiffStatus,
} from "../../library/comparison/nodeComparison";
import "./NodeComparisonPanel.css";

export interface ComparisonState {
  leftNodeId: number | null;
  rightNodeId: number | null;
}

export const initialComparisonState: ComparisonState = {
  leftNodeId: null,
  rightNodeId: null,
};

interface NodeComparisonPanelProps {
  nodes: D3Node[];
  pinnedNodeIds: number[];
  comparisonState: ComparisonState;
  setComparisonState: React.Dispatch<React.SetStateAction<ComparisonState>>;
}

function getNodeLabel(node: D3Node): string {
  const { metadata } = node.details;
  const elapsed = Math.max(...node.details.elapsedTimes);
  return `${metadata.$kind}#${metadata.retrievalId} (${elapsed}ms)`;
}

function getDiffClass(status: DiffStatus): string {
  switch (status) {
    case "same":
      return "diff-same";
    case "left-only":
      return "diff-left-only";
    case "right-only":
      return "diff-right-only";
    case "different":
      return "diff-different";
    case "na":
      return "diff-na";
  }
}

function ScalarRow({
  label,
  result,
}: {
  label: string;
  result: ScalarDiffResult;
}) {
  const leftClass = getDiffClass(
    result.leftValue === null
      ? "na"
      : result.status === "same"
        ? "same"
        : result.status === "left-only"
          ? "left-only"
          : "different",
  );
  const rightClass = getDiffClass(
    result.rightValue === null
      ? "na"
      : result.status === "same"
        ? "same"
        : result.status === "right-only"
          ? "right-only"
          : "different",
  );

  return (
    <tr>
      <td className="comparison-attr">{label}</td>
      <td className={`comparison-value ${leftClass}`}>
        {result.leftValue ?? <span className="diff-na">N/A</span>}
      </td>
      <td className={`comparison-value ${rightClass}`}>
        {result.rightValue ?? <span className="diff-na">N/A</span>}
      </td>
    </tr>
  );
}

function ArrayRow({ label, items }: { label: string; items: ArrayDiffItem[] }) {
  // Split items for left and right columns
  const leftItems = items.filter((i) => i.status !== "right-only");
  const rightItems = items.filter((i) => i.status !== "left-only");

  // Sort: common items first (alphabetically), then unique items (alphabetically)
  const sortItems = (arr: ArrayDiffItem[]) => {
    const common = arr.filter((i) => i.status === "same");
    const unique = arr.filter((i) => i.status !== "same");
    return [...common, ...unique];
  };

  const sortedLeft = sortItems(leftItems);
  const sortedRight = sortItems(rightItems);

  return (
    <tr>
      <td className="comparison-attr">{label}</td>
      <td className="comparison-value">
        {sortedLeft.length === 0 ? (
          <span className="diff-na">N/A</span>
        ) : (
          <ul className="comparison-list">
            {sortedLeft.map((item, i) => (
              <li key={i} className={getDiffClass(item.status)}>
                {item.value}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="comparison-value">
        {sortedRight.length === 0 ? (
          <span className="diff-na">N/A</span>
        ) : (
          <ul className="comparison-list">
            {sortedRight.map((item, i) => (
              <li key={i} className={getDiffClass(item.status)}>
                {item.value}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function LevelsList({
  levels,
  side,
}: {
  levels: LevelDiffItem[];
  side: "left" | "right";
}) {
  // Filter levels that exist on this side
  const visibleLevels = levels.filter((level) =>
    side === "left" ? level.leftPath !== null : level.rightPath !== null,
  );

  if (visibleLevels.length === 0) {
    return null;
  }

  return (
    <ul className="location-levels-list">
      {visibleLevels.map((level) => {
        const path = side === "left" ? level.leftPath : level.rightPath;
        const levelClass = getDiffClass(
          level.status === "same"
            ? "same"
            : level.status === (side === "left" ? "left-only" : "right-only")
              ? side === "left"
                ? "left-only"
                : "right-only"
              : "different",
        );
        return (
          <li key={level.levelName} className={levelClass}>
            <span className="level-index">[{level.levelIndex}]</span>
            <span className="level-name">{level.levelName}:</span>{" "}
            <span className="level-path">{path}</span>
          </li>
        );
      })}
    </ul>
  );
}

function LocationRow({
  label,
  items,
}: {
  label: string;
  items: LocationDiffItem[];
}) {
  if (items.length === 0) {
    return (
      <tr>
        <td className="comparison-attr">{label}</td>
        <td className="comparison-value">
          <span className="diff-na">N/A</span>
        </td>
        <td className="comparison-value">
          <span className="diff-na">N/A</span>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="comparison-attr">{label}</td>
      <td className="comparison-value">
        <ul className="comparison-list location-list">
          {items.map((item) => {
            // Skip hierarchies that only exist on the right
            if (item.status === "right-only") {
              return null;
            }
            const headerClass = getDiffClass(
              item.status === "same"
                ? "same"
                : item.status === "left-only"
                  ? "left-only"
                  : "different",
            );
            return (
              <li key={item.key} className="location-item">
                <span className={`location-key ${headerClass}`}>
                  {item.key}
                </span>
                <LevelsList levels={item.levels} side="left" />
              </li>
            );
          })}
        </ul>
      </td>
      <td className="comparison-value">
        <ul className="comparison-list location-list">
          {items.map((item) => {
            // Skip hierarchies that only exist on the left
            if (item.status === "left-only") {
              return null;
            }
            const headerClass = getDiffClass(
              item.status === "same"
                ? "same"
                : item.status === "right-only"
                  ? "right-only"
                  : "different",
            );
            return (
              <li key={item.key} className="location-item">
                <span className={`location-key ${headerClass}`}>
                  {item.key}
                </span>
                <LevelsList levels={item.levels} side="right" />
              </li>
            );
          })}
        </ul>
      </td>
    </tr>
  );
}

export function NodeComparisonPanel({
  nodes,
  pinnedNodeIds,
  comparisonState,
  setComparisonState,
}: NodeComparisonPanelProps) {
  const pinnedNodes = pinnedNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is D3Node => n !== undefined);

  const leftNode = comparisonState.leftNodeId
    ? nodes.find((n) => n.id === comparisonState.leftNodeId)
    : null;
  const rightNode = comparisonState.rightNodeId
    ? nodes.find((n) => n.id === comparisonState.rightNodeId)
    : null;

  const comparison =
    leftNode && rightNode
      ? compareNodes(leftNode.details.metadata, rightNode.details.metadata)
      : null;

  return (
    <div className="node-comparison-panel">
      <div className="comparison-selectors">
        <Form.Group className="comparison-selector">
          <Form.Label>Left Node</Form.Label>
          <Form.Select
            size="sm"
            value={comparisonState.leftNodeId ?? ""}
            onChange={(e) =>
              setComparisonState((prev) => ({
                ...prev,
                leftNodeId: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">Select a node...</option>
            {pinnedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {getNodeLabel(node)}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="comparison-selector">
          <Form.Label>Right Node</Form.Label>
          <Form.Select
            size="sm"
            value={comparisonState.rightNodeId ?? ""}
            onChange={(e) =>
              setComparisonState((prev) => ({
                ...prev,
                rightNodeId: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">Select a node...</option>
            {pinnedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {getNodeLabel(node)}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      {!leftNode || !rightNode ? (
        <div className="comparison-empty">
          {pinnedNodes.length < 2 ? (
            <p>
              Pin at least 2 nodes in the Details panel to compare them. You can
              also use the Left/Right buttons to select nodes for comparison.
            </p>
          ) : (
            <p>Select two nodes above to compare their attributes.</p>
          )}
        </div>
      ) : (
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comparison-attr">Attribute</th>
                <th className="comparison-value">Left Node</th>
                <th className="comparison-value">Right Node</th>
              </tr>
            </thead>
            <tbody>
              <ScalarRow label="Type" result={comparison!.type} />
              <LocationRow label="Location" items={comparison!.location} />
              <ArrayRow label="Measures" items={comparison!.measures} />
              <ScalarRow label="Filter ID" result={comparison!.filterId} />
              <ScalarRow label="Provider" result={comparison!.provider} />
              <ScalarRow
                label="Partitioning"
                result={comparison!.partitioning}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

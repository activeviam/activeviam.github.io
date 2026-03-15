import React from "react";
import { Form } from "react-bootstrap";
import { D3Node } from "../../library/dataStructures/d3/d3Node";
import {
  compareNodes,
  ArrayDiffItem,
  LocationDiffItem,
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

function getDiffClass(status: DiffStatus, side?: "left" | "right"): string {
  switch (status) {
    case "same":
      return "diff-same";
    case "left-only":
      return "diff-left-only";
    case "right-only":
      return "diff-right-only";
    case "different":
      // When values differ, use the side-specific color
      return side === "left" ? "diff-left-different" : "diff-right-different";
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
  const leftStatus =
    result.leftValue === null
      ? "na"
      : result.status === "same"
        ? "same"
        : result.status === "left-only"
          ? "left-only"
          : "different";
  const rightStatus =
    result.rightValue === null
      ? "na"
      : result.status === "same"
        ? "same"
        : result.status === "right-only"
          ? "right-only"
          : "different";

  return (
    <tr>
      <td className="comparison-attr">{label}</td>
      <td className={`comparison-value ${getDiffClass(leftStatus, "left")}`}>
        {result.leftValue ?? <span className="diff-na">N/A</span>}
      </td>
      <td className={`comparison-value ${getDiffClass(rightStatus, "right")}`}>
        {result.rightValue ?? <span className="diff-na">N/A</span>}
      </td>
    </tr>
  );
}

interface AlignedRow {
  leftValue: string | null;
  leftStatus: DiffStatus;
  rightValue: string | null;
  rightStatus: DiffStatus;
}

function buildAlignedArrayRows(items: ArrayDiffItem[]): AlignedRow[] {
  // Sort items: same first (alphabetically), then left-only, then right-only
  const same = items
    .filter((i) => i.status === "same")
    .sort((a, b) => a.value.localeCompare(b.value));
  const leftOnly = items
    .filter((i) => i.status === "left-only")
    .sort((a, b) => a.value.localeCompare(b.value));
  const rightOnly = items
    .filter((i) => i.status === "right-only")
    .sort((a, b) => a.value.localeCompare(b.value));

  const rows: AlignedRow[] = [];

  // Same items appear on both sides
  for (const item of same) {
    rows.push({
      leftValue: item.value,
      leftStatus: "same",
      rightValue: item.value,
      rightStatus: "same",
    });
  }

  // Left-only and right-only items - interleave or stack
  const maxUnique = Math.max(leftOnly.length, rightOnly.length);
  for (let i = 0; i < maxUnique; i++) {
    const left = leftOnly[i];
    const right = rightOnly[i];
    rows.push({
      leftValue: left?.value ?? null,
      leftStatus: left ? "left-only" : "na",
      rightValue: right?.value ?? null,
      rightStatus: right ? "right-only" : "na",
    });
  }

  return rows;
}

function ArrayRows({
  label,
  items,
}: {
  label: string;
  items: ArrayDiffItem[];
}) {
  const rows = buildAlignedArrayRows(items);

  if (rows.length === 0) {
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
    <>
      {rows.map((row, i) => (
        <tr key={i}>
          {i === 0 && (
            <td className="comparison-attr" rowSpan={rows.length}>
              {label}
            </td>
          )}
          <td
            className={`comparison-value comparison-cell ${getDiffClass(row.leftStatus, "left")}`}
          >
            {row.leftValue ?? ""}
          </td>
          <td
            className={`comparison-value comparison-cell ${getDiffClass(row.rightStatus, "right")}`}
          >
            {row.rightValue ?? ""}
          </td>
        </tr>
      ))}
    </>
  );
}

interface LocationAlignedRow {
  type: "hierarchy" | "level";
  // For hierarchy rows
  hierarchyKey?: string;
  leftHierarchyStatus?: DiffStatus;
  rightHierarchyStatus?: DiffStatus;
  // For level rows
  levelIndex?: number;
  leftLevelName?: string | null;
  leftLevelPath?: string | null;
  leftLevelStatus?: DiffStatus;
  rightLevelName?: string | null;
  rightLevelPath?: string | null;
  rightLevelStatus?: DiffStatus;
}

function buildAlignedLocationRows(
  items: LocationDiffItem[],
): LocationAlignedRow[] {
  const rows: LocationAlignedRow[] = [];

  for (const item of items) {
    // Add hierarchy header row
    const leftHierarchyStatus: DiffStatus =
      item.status === "right-only"
        ? "na"
        : item.status === "same"
          ? "same"
          : item.status === "left-only"
            ? "left-only"
            : "different";
    const rightHierarchyStatus: DiffStatus =
      item.status === "left-only"
        ? "na"
        : item.status === "same"
          ? "same"
          : item.status === "right-only"
            ? "right-only"
            : "different";

    rows.push({
      type: "hierarchy",
      hierarchyKey: item.key,
      leftHierarchyStatus,
      rightHierarchyStatus,
    });

    // Add level rows - aligned by level index
    for (const level of item.levels) {
      const leftLevelStatus: DiffStatus =
        level.leftPath === null
          ? "na"
          : level.status === "same"
            ? "same"
            : level.status === "left-only"
              ? "left-only"
              : "different";
      const rightLevelStatus: DiffStatus =
        level.rightPath === null
          ? "na"
          : level.status === "same"
            ? "same"
            : level.status === "right-only"
              ? "right-only"
              : "different";

      rows.push({
        type: "level",
        levelIndex: level.levelIndex,
        leftLevelName: level.leftPath !== null ? level.levelName : null,
        leftLevelPath: level.leftPath,
        leftLevelStatus,
        rightLevelName: level.rightPath !== null ? level.levelName : null,
        rightLevelPath: level.rightPath,
        rightLevelStatus,
      });
    }
  }

  return rows;
}

function LocationRows({
  label,
  items,
}: {
  label: string;
  items: LocationDiffItem[];
}) {
  const rows = buildAlignedLocationRows(items);

  if (rows.length === 0) {
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
    <>
      {rows.map((row, i) => (
        <tr key={i}>
          {i === 0 && (
            <td className="comparison-attr" rowSpan={rows.length}>
              {label}
            </td>
          )}
          {row.type === "hierarchy" ? (
            <>
              <td
                className={`comparison-value comparison-cell location-hierarchy-cell ${getDiffClass(row.leftHierarchyStatus!, "left")}`}
              >
                {row.leftHierarchyStatus !== "na" ? row.hierarchyKey : ""}
              </td>
              <td
                className={`comparison-value comparison-cell location-hierarchy-cell ${getDiffClass(row.rightHierarchyStatus!, "right")}`}
              >
                {row.rightHierarchyStatus !== "na" ? row.hierarchyKey : ""}
              </td>
            </>
          ) : (
            <>
              <td
                className={`comparison-value comparison-cell location-level-cell ${getDiffClass(row.leftLevelStatus!, "left")}`}
              >
                {row.leftLevelName !== null && (
                  <>
                    <span className="level-index">[{row.levelIndex}]</span>
                    <span className="level-name">
                      {row.leftLevelName}:
                    </span>{" "}
                    <span className="level-path">{row.leftLevelPath}</span>
                  </>
                )}
              </td>
              <td
                className={`comparison-value comparison-cell location-level-cell ${getDiffClass(row.rightLevelStatus!, "right")}`}
              >
                {row.rightLevelName !== null && (
                  <>
                    <span className="level-index">[{row.levelIndex}]</span>
                    <span className="level-name">
                      {row.rightLevelName}:
                    </span>{" "}
                    <span className="level-path">{row.rightLevelPath}</span>
                  </>
                )}
              </td>
            </>
          )}
        </tr>
      ))}
    </>
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
              <LocationRows label="Location" items={comparison!.location} />
              <ArrayRows label="Measures" items={comparison!.measures} />
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

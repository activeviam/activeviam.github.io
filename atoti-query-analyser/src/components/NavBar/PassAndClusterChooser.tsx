import { NavDropdown } from "react-bootstrap";
import React from "react";
import { QueryPlanMetadata } from "../../library/graphProcessors/extractMetadata";

/**
 * Builds text label for pass dropdown
 */
function passLabel({ pass: passId, passType }: QueryPlanMetadata) {
  return `[${passId}] - ${passType}`;
}

/**
 * Builds text label for cluster dropdown
 */
function clusterLabel(query: QueryPlanMetadata): string {
  return query.name || `Query_${query.id}`;
}

interface PassAndClusterChooserProps {
  queryMetadata: QueryPlanMetadata[];
  currentPassId: number;
  currentQueryId: number;
  onPassChange: (passId: number) => void;
  onClusterChange: (queryId: number) => void;
}

/**
 * This React component provides two cascading dropdowns:
 * 1. Pass dropdown: Select mdxPass (pass number)
 * 2. Cluster dropdown: Select clusterMemberId within the selected pass
 *
 * @param attributes - React JSX attributes
 * @param attributes.queryMetadata - array of queries metadata
 * @param attributes.currentPassId - id of the current pass
 * @param attributes.currentQueryId - id of the current query
 * @param attributes.onPassChange - callback for changing selected pass
 * @param attributes.onClusterChange - callback for changing selected cluster
 */
export function PassAndClusterChooser({
  queryMetadata,
  currentPassId,
  currentQueryId,
  onPassChange,
  onClusterChange,
}: PassAndClusterChooserProps) {
  // Get all unique passes (root queries only), sorted descending
  const allPasses = queryMetadata
    .filter((query) => query.parentId === null)
    .sort((a, b) => b.pass - a.pass);

  // Get unique pass IDs for the pass dropdown
  const uniquePasses = Array.from(
    new Map(allPasses.map((p) => [p.pass, p])).values(),
  );

  // Get all queries (clusters) in the current pass
  const queriesInCurrentPass = queryMetadata.filter(
    (q) => q.pass === currentPassId,
  );

  // Sort clusters alphabetically by name for display
  const sortedClusters = [...queriesInCurrentPass].sort((a, b) =>
    clusterLabel(a).localeCompare(clusterLabel(b)),
  );

  const showPassDropdown = uniquePasses.length > 1;
  const showClusterDropdown = sortedClusters.length > 1;

  // Find active pass for label
  const activePass = uniquePasses.find((p) => p.pass === currentPassId);
  const passDropdownTitle = activePass ? passLabel(activePass) : "Query pass";

  // Find active cluster for label
  const activeCluster = queryMetadata.find((q) => q.id === currentQueryId);
  const clusterDropdownTitle = activeCluster
    ? clusterLabel(activeCluster)
    : "Cluster";

  return (
    <>
      {showPassDropdown && (
        <NavDropdown
          title={passDropdownTitle}
          id="pass-dropdown"
          align="end"
          className="me-2"
        >
          {uniquePasses.map((pass) => (
            <NavDropdown.Item
              key={pass.pass}
              as="button"
              active={pass.pass === currentPassId}
              onClick={() => onPassChange(pass.pass)}
            >
              {passLabel(pass)}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      )}
      {showClusterDropdown && (
        <NavDropdown
          title={clusterDropdownTitle}
          id="cluster-dropdown"
          align="end"
        >
          {sortedClusters.map((query) => (
            <NavDropdown.Item
              key={query.id}
              as="button"
              active={query.id === currentQueryId}
              onClick={() => onClusterChange(query.id)}
            >
              {clusterLabel(query)}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      )}
    </>
  );
}

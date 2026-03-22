import { D3Node } from "../dataStructures/d3/d3Node";
import {
  AggregateRetrievalKind,
  AggregateRetrieval,
  RetrievalGraph,
  PartitionCondensedRetrievalKind,
  PartitionCondensedRetrieval,
} from "../dataStructures/json/retrieval";

/**
 * Color palette for partitioning schemes (12 perceptually distinct colors).
 * From d3 categorical color schemes.
 */
const PARTITION_COLORS = [
  "#4e79a7", // blue
  "#f28e2c", // orange
  "#e15759", // red
  "#76b7b2", // teal
  "#59a14f", // green
  "#edc949", // yellow
  "#af7aa1", // purple
  "#ff9da7", // pink
  "#9c755f", // brown
  "#bab0ab", // gray-brown
  "#86bcb6", // light teal
  "#d37295", // magenta
];

/**
 * Default color for nodes without partitioning (VirtualRetrieval, ExternalRetrieval).
 */
const NO_PARTITIONING_COLOR = "#cccccc";

/**
 * Extract partitioning value from a D3 node's metadata if available.
 */
function getPartitioning(d: D3Node): string | undefined {
  const metadata = d.details.metadata;

  if (metadata.$kind === AggregateRetrievalKind) {
    return (metadata as AggregateRetrieval).partitioning;
  }

  if (metadata.$kind === PartitionCondensedRetrievalKind) {
    return (metadata as PartitionCondensedRetrieval).partitioning;
  }

  return undefined;
}

/**
 * Build a mapping from unique partitioning values to colors.
 * Iterates through all vertices in the graph and assigns colors from the palette.
 *
 * @param graph - The retrieval graph to extract partitioning values from
 * @returns A map from partitioning string to color
 */
export function buildPartitioningColorMap(
  graph: RetrievalGraph,
): Map<string, string> {
  const partitionings = new Set<string>();

  // Collect all unique partitioning values
  for (const vertex of graph.getVertices()) {
    const metadata = vertex.getMetadata();

    if (metadata.$kind === AggregateRetrievalKind) {
      partitionings.add((metadata as AggregateRetrieval).partitioning);
    } else if (metadata.$kind === PartitionCondensedRetrievalKind) {
      partitionings.add((metadata as PartitionCondensedRetrieval).partitioning);
    }
  }

  // Assign colors from palette, cycling if needed
  const colorMap = new Map<string, string>();
  let colorIndex = 0;

  for (const partitioning of partitionings) {
    colorMap.set(
      partitioning,
      PARTITION_COLORS[colorIndex % PARTITION_COLORS.length],
    );
    colorIndex++;
  }

  return colorMap;
}

/**
 * Get the color for a node based on its partitioning value.
 *
 * @param d - The D3 node
 * @param colorMap - Mapping from partitioning values to colors
 * @returns The color for the node
 */
export function getPartitioningColor(
  d: D3Node,
  colorMap: Map<string, string>,
): string {
  const partitioning = getPartitioning(d);

  if (partitioning === undefined) {
    return NO_PARTITIONING_COLOR;
  }

  return colorMap.get(partitioning) || NO_PARTITIONING_COLOR;
}

/**
 * Create a background color function that uses the partitioning color map.
 *
 * @param colorMap - Mapping from partitioning values to colors
 * @returns A function that takes a D3Node and returns its color
 */
export function createPartitioningColorFn(
  colorMap: Map<string, string>,
): (d: D3Node) => string {
  return (d: D3Node) => getPartitioningColor(d, colorMap);
}

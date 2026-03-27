const TYPE_LABELS = new Map([
  ["DistributedAggregatesRetrieval", "Distributed Retrieval"],
  ["DistributedPostProcessedRetrieval", "PostProcessor"],
  ["JITPrimitiveAggregatesRetrieval", "JIT Retrieval"],
  ["NoOpPrimitiveAggregatesRetrieval", "No-op"],
  ["PostProcessedAggregatesRetrieval", "PostProcessor"],
  ["PostProcessedResultsMerger", "Merger"],
  ["PrimitiveResultsMerger", "Merger"],
  ["RangeSharingPrimitiveAggregatesRetrieval", "RangeSharing"],
  ["PartialPrimitiveAggregatesRetrieval", "Partial Retrieval"],
  ["PrimitiveAnalysisAggregationRetrieval", "Primitive Procedure"],
  ["BitmapPrimitiveAggregatesRetrieval", "Bitmap Retrieval"],
]);

/**
 * Given retrieval class name, return a human-readable label.
 */
export function type(value: string) {
  return TYPE_LABELS.get(value) || `<${value}>`;
}

const typeLabels = new Map([
  ["DistributedAggregatesRetrieval", "Distributed Retrieval"],
  ["DistributedPostProcessedRetrieval", "PostProcessor"],
  ["JITPrimitiveAggregatesRetrieval", "JIT Retrieval"],
  ["NoOpPrimitiveAggregatesRetrieval", "No-op"],
  ["PostProcessedAggregatesRetrieval", "PostProcessor"],
  ["PostProcessedResultsMerger", "Merger"],
  ["PrimitiveResultsMerger", "Merger"],
  ["RangeSharingPrimitiveAggregatesRetrieval", "RangeSharing"]
]);

const type = value => typeLabels.get(value) || `<${value}>`;

export { type };

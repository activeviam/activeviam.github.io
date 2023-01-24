import { QueryPlanMetadata } from "@library/graphProcessors/extractMetadata";

/**
 * This React component shows passes info.
 * @param {{metadata: QueryPlanMetadata[] }} attributes - React JSX attributes
 * @param {QueryPlanMetadata[]} attributes.metadata - query plan metadata
 * */
export function PassGraph({
  metadata,
}: {
  metadata: QueryPlanMetadata[];
}): JSX.Element;

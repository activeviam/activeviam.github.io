import { describe, expect, it } from "vitest";
import {
  detectGcPauses,
  extractTimingSamples,
  median,
  TimingSample,
} from "library/gcDetection/detectGcPauses";
import { ALL_FIXTURES, loadQueryPlans } from "../parsing/fixtures";

/**
 * Builds the samples of a retrieval whose partitions run one after the other,
 * each one lasting `elapsed` ms, except the ones listed in `slowed`.
 */
function retrieval(
  retrievalId: number,
  {
    start,
    partitions = 5,
    step = 100,
    elapsed = 100,
    slowed = {},
  }: {
    start: number;
    partitions?: number;
    step?: number;
    elapsed?: number;
    slowed?: Record<number, number>;
  },
): TimingSample[] {
  return Array.from({ length: partitions }, (_, partition) => ({
    retrievalId,
    kind: "AggregateRetrieval",
    type: "PrimitiveAggregatesRetrieval",
    partition,
    start: start + partition * step,
    elapsed: elapsed + (slowed[partition] ?? 0),
  }));
}

describe("median", () => {
  it("handles odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("detectGcPauses", () => {
  it("detects a gap confirmed by a concurrent operation", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 500 } }),
      ...retrieval(2, { start: 150, slowed: { 1: 500 } }),
    ]);
    expect(report.analyzedRetrievals).toBe(2);
    expect(report.analyzedSamples).toBe(10);
    expect(report.events).toHaveLength(1);
    const [event] = report.events;
    expect(event.estimatedDurationMs).toBe(500);
    expect(event.retrievalCount).toBe(2);
    expect(event.impacted).toHaveLength(2);
    // Partitions [200, 800] and [250, 850]: the GC is in their intersection.
    expect(event.windowStart).toBe(250);
    expect(event.windowEnd).toBe(800);
    expect(event.approximateWindow).toBe(false);
  });

  it("uses smaller concurrent gaps as confirmations", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 500 } }),
      ...retrieval(2, { start: 150, slowed: { 1: 280 } }),
    ]);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].impacted.map((op) => op.role)).toEqual(["candidate", "confirmation"]);
  });

  it("ignores an isolated gap", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 500 } }),
      ...retrieval(2, { start: 150 }),
    ]);
    expect(report.candidateCount).toBe(1);
    expect(report.events).toHaveLength(0);
  });

  it("ignores gaps below the threshold", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 250 } }),
      ...retrieval(2, { start: 150, slowed: { 1: 250 } }),
    ]);
    expect(report.candidateCount).toBe(0);
    expect(report.events).toHaveLength(0);
  });

  it("ignores the retrievals with fewer than 3 partitions", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 500 } }),
      ...retrieval(2, { start: 150, partitions: 2, slowed: { 1: 500 } }),
    ]);
    expect(report.analyzedRetrievals).toBe(1);
    expect(report.events).toHaveLength(0);
  });

  it("separates distinct GCs and merges concurrent candidates", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 400 } }),
      ...retrieval(2, { start: 150, slowed: { 1: 400 } }),
      ...retrieval(3, { start: 180, slowed: { 1: 400 } }),
      ...retrieval(4, { start: 5000, slowed: { 3: 900 } }),
      ...retrieval(5, { start: 5250, slowed: { 0: 900 } }),
    ]);
    expect(report.events).toHaveLength(2);
    expect(report.events.map((event) => event.retrievalCount)).toEqual([3, 2]);
    expect(report.events.map((event) => event.estimatedDurationMs)).toEqual([400, 900]);
    expect(report.events.map((event) => event.id)).toEqual([1, 2]);
  });

  it("does not merge two GCs through an operation spanning both", () => {
    const report = detectGcPauses([
      ...retrieval(1, { start: 0, slowed: { 2: 400 } }),
      ...retrieval(2, { start: 150, slowed: { 1: 400 } }),
      ...retrieval(3, { start: 2000, slowed: { 2: 400 } }),
      ...retrieval(4, { start: 2150, slowed: { 1: 400 } }),
      // Partition 1 runs from 300 to 2700, through both GCs.
      ...retrieval(5, { start: 200, step: 3000, slowed: { 1: 2300 } }),
    ]);
    expect(report.events).toHaveLength(2);
  });

  it("finds the 3 GCs of the synthetic fixture", async () => {
    const [plan] = await loadQueryPlans("gc-pauses-plan.json");
    const report = detectGcPauses(extractTimingSamples(plan.graph));

    // Pauses injected by scripts/generateGcFixture.mjs.
    const injected = [
      { at: 1000, duration: 400 },
      { at: 3000, duration: 700 },
      { at: 5300, duration: 1200 },
    ];
    expect(report.events).toHaveLength(injected.length);
    report.events.forEach((event, i) => {
      const { at, duration } = injected[i];
      expect(event.windowStart).toBeLessThanOrEqual(at);
      expect(event.windowEnd).toBeGreaterThanOrEqual(at + duration);
      expect(Math.abs(event.estimatedDurationMs - duration)).toBeLessThan(50);
      expect(event.retrievalCount).toBeGreaterThanOrEqual(3);
    });
  });

  it.each(ALL_FIXTURES.filter((file) => file !== "gc-pauses-plan.json"))(
    "runs on %s without error",
    async (filename) => {
      const plans = await loadQueryPlans(filename);
      for (const plan of plans) {
        const report = detectGcPauses(extractTimingSamples(plan.graph));
        expect(report.events.length).toBeGreaterThanOrEqual(0);
      }
    },
  );
});

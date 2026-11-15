import { describe, expect, it } from "vitest";
import {
  DEFAULT_GC_DETECTION_PARAMS,
  detectGcPauses,
  extractTimingSamples,
  median,
  robustSigma,
  TimingSample,
} from "library/gcDetection/detectGcPauses";
import { ALL_FIXTURES, loadQueryPlans } from "../parsing/fixtures";

type RetrievalSpec = {
  id: number;
  start: number;
  partitions?: number;
  step?: number;
  elapsed?: number;
};

/**
 * Builds a timeline of retrievals whose partitions run one after the other
 * (`step` ms between two starts), then applies GC pauses: a GC freezes the
 * partitions running at that time, and delays everything starting after it.
 */
function timeline(
  specs: RetrievalSpec[],
  gcs: { at: number; duration: number }[] = [],
): TimingSample[] {
  const samples = specs.flatMap(({ id, start, partitions = 5, step = 100, elapsed = 80 }) =>
    Array.from({ length: partitions }, (_, partition) => ({
      retrievalId: id,
      kind: "AggregateRetrieval",
      type: "PrimitiveAggregatesRetrieval",
      partition,
      start: start + partition * step,
      elapsed,
    })),
  );
  // The latest GC first, so that the instants of the earlier ones stay valid
  for (const { at, duration } of [...gcs].sort((a, b) => b.at - a.at)) {
    for (const sample of samples) {
      if (sample.start >= at) {
        sample.start += duration;
      } else if (sample.start + sample.elapsed > at) {
        sample.elapsed += duration;
      }
    }
  }
  return samples;
}

/** Builds the samples of a retrieval from explicit [start, elapsed] pairs. */
function partitions(
  retrievalId: number,
  timings: [number, number][],
  kind = "AggregateRetrieval",
): TimingSample[] {
  return timings.map(([start, elapsed], partition) => ({
    retrievalId,
    kind,
    type: "PrimitiveAggregatesRetrieval",
    partition,
    start,
    elapsed,
  }));
}

/** Partitions of retrieval 15 of v1-retail.txt, all started at t = 9. */
const RETRIEVAL_15 = [
  3403, 10469, 6141, 6750, 9103, 6732, 5238, 5577, 5671, 9042, 5641, 5720, 6494, 8805, 2569, 8174,
  6014, 7283, 8755, 8675, 9143, 7874, 6577, 4976, 3597, 8729, 10327, 9338, 6256, 4745, 8475, 5416,
];
/** Partitions of retrieval 10 of v1-retail.txt, all started at t = 9. */
const RETRIEVAL_10 = [
  251, 313, 235, 261, 146, 359, 191, 120, 226, 357, 365, 730, 394, 383, 277, 755, 46, 277, 368, 230,
  311, 233, 300, 337, 220, 566, 310, 175, 249, 376, 324, 390,
];

/**
 * A candidate of retrieval 1 slowed by a 500 ms GC in [200, 780], and a
 * partition of retrieval 3 showing a smaller gap (270 ms) at the same time.
 */
const CANDIDATE = partitions(1, [
  [0, 80],
  [100, 80],
  [200, 580],
  [800, 80],
  [900, 80],
]);
const CONFIRMATION = partitions(3, [
  [150, 650],
  [1000, 380],
  [1500, 380],
]);

describe("statistics", () => {
  it("computes the median of odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("computes a robust standard deviation, insensitive to outliers", () => {
    expect(robustSigma([100, 110, 120, 130, 1300])).toBeCloseTo(14.826);
    expect(robustSigma([5, 5, 5])).toBe(0);
  });
});

describe("detectGcPauses", () => {
  it("detects a GC slowing down concurrent partitions", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 30 },
        ],
        [{ at: 250, duration: 500 }],
      ),
    );
    expect(report.analyzedRetrievals).toBe(2);
    expect(report.analyzedSamples).toBe(10);
    expect(report.events).toHaveLength(1);
    const [event] = report.events;
    expect(event.estimatedDurationMs).toBe(500);
    expect(event.retrievalCount).toBe(2);
    expect(event.impacted).toHaveLength(2);
    // Slowed partitions [200, 780] and [230, 810]: the GC is in their intersection
    expect(event.slots).toEqual([{ start: 230, end: 780 }]);
    expect([event.windowStart, event.windowEnd]).toEqual([230, 780]);
    expect(event.approximateWindow).toBe(false);
  });

  it("ignores a gap that no other partition shows", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 2000 },
        ],
        [{ at: 250, duration: 500 }],
      ),
    );
    expect(report.candidateCount).toBe(1);
    expect(report.unconfirmed).toBe(1);
    expect(report.events).toHaveLength(0);
  });

  it("ignores gaps below the threshold", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 30 },
        ],
        [{ at: 250, duration: 250 }],
      ),
    );
    expect(report.candidateCount).toBe(0);
    expect(report.events).toHaveLength(0);
  });

  it("does not measure the retrievals with fewer than 3 partitions", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 30, partitions: 2 },
        ],
        [{ at: 250, duration: 500 }],
      ),
    );
    expect(report.analyzedRetrievals).toBe(1);
    expect(report.totalSamples).toBe(7);
    expect(report.events).toHaveLength(0);
  });

  it("separates distinct GCs and merges concurrent candidates", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 30 },
          { id: 3, start: 200 },
          { id: 4, start: 2950 },
          { id: 5, start: 2980 },
        ],
        [
          { at: 250, duration: 400 },
          { at: 3000, duration: 900 },
        ],
      ),
    );
    expect(report.events.map((event) => event.retrievalCount)).toEqual([3, 2]);
    expect(report.events.map((event) => event.estimatedDurationMs)).toEqual([400, 900]);
    expect(report.events.map((event) => event.id)).toEqual([1, 2]);
  });

  it("does not merge two GCs through a partition spanning both", () => {
    const report = detectGcPauses(
      timeline(
        [
          { id: 1, start: 0 },
          { id: 2, start: 30 },
          { id: 3, start: 2050 },
          { id: 4, start: 2080 },
          { id: 5, start: 200, step: 3000, elapsed: 2200 },
        ],
        [
          { at: 250, duration: 400 },
          { at: 2300, duration: 400 },
        ],
      ),
    );
    expect(report.events).toHaveLength(2);
  });

  describe("dispersion", () => {
    it("ignores gaps within the usual variation of the partitions", () => {
      // 3σ ≈ 7.1 s: not even the slowest partition (+3.8 s) is a candidate
      const report = detectGcPauses(
        partitions(
          15,
          RETRIEVAL_15.map((elapsed) => [9, elapsed]),
        ),
      );
      expect(report.candidateCount).toBe(0);
    });

    it("keeps the gaps above 3σ as candidates", () => {
      // σ ≈ 105 ms: 730 ms and 755 ms are 425 ms and 450 ms above the median
      const report = detectGcPauses(
        partitions(
          10,
          RETRIEVAL_10.map((elapsed) => [9, elapsed]),
        ),
      );
      expect(report.candidateCount).toBe(2);
      // The other partitions end while the supposed GC runs
      expect(report.rejectedByContradiction).toBe(1);
      expect(report.events).toHaveLength(0);
    });

    it("is not hidden by the outlier itself", () => {
      const report = detectGcPauses(
        partitions(1, [
          [0, 100],
          [200, 110],
          [400, 120],
          [600, 130],
          [800, 1300],
        ]),
      );
      expect(report.candidateCount).toBe(1);
    });

    it("does not use retrievals too dispersed to reveal the GC as confirmations", () => {
      // 3σ ≈ 8.9 s for retrieval 2, far above the 500 ms GC
      const noisy = partitions(2, [
        [0, 1000],
        [0, 3000],
        [0, 5000],
        [0, 7000],
        [0, 9000],
      ]);
      const unconfirmed = detectGcPauses([...CANDIDATE, ...noisy]);
      expect(unconfirmed.candidateCount).toBe(1);
      expect(unconfirmed.unconfirmed).toBe(1);
      expect(unconfirmed.events).toHaveLength(0);

      const confirmed = detectGcPauses([...CANDIDATE, ...noisy, ...CONFIRMATION]);
      expect(confirmed.events).toHaveLength(1);
      const impacted = confirmed.events[0].impacted;
      expect(impacted.map((op) => [op.retrievalId, op.role])).toEqual([
        [3, "confirmation"],
        [1, "candidate"],
      ]);
      expect(impacted[1].zScore).toBeNull();
    });
  });

  describe("contradictions", () => {
    const external = (start: number, elapsed: number) =>
      partitions(0, [[start, elapsed]], "ExternalRetrieval");

    it("keeps a GC fitting between partition boundaries", () => {
      const report = detectGcPauses([...CANDIDATE, ...CONFIRMATION]);
      expect(report.events).toHaveLength(1);
      expect(report.events[0].slots).toEqual([{ start: 200, end: 780 }]);
    });

    it("rejects a GC during which a partition ends", () => {
      const report = detectGcPauses([...CANDIDATE, ...CONFIRMATION, ...external(100, 400)]);
      expect(report.rejectedByContradiction).toBe(1);
      expect(report.events).toHaveLength(0);
    });

    it("rejects a GC during which a partition starts", () => {
      const report = detectGcPauses([...CANDIDATE, ...CONFIRMATION, ...external(500, 1000)]);
      expect(report.rejectedByContradiction).toBe(1);
      expect(report.events).toHaveLength(0);
    });

    it("narrows the window to the time ranges free of boundaries", () => {
      const report = detectGcPauses([...CANDIDATE, ...CONFIRMATION, ...external(190, 110)]);
      expect(report.events).toHaveLength(1);
      expect(report.events[0].slots).toEqual([{ start: 300, end: 780 }]);
      expect(report.events[0].windowStart).toBe(300);
    });
  });

  it("finds the 3 GCs of the synthetic fixture", async () => {
    const [plan] = await loadQueryPlans("gc-pauses-plan.json");
    const report = detectGcPauses(extractTimingSamples(plan.graph));

    // Pauses injected by scripts/generateGcFixture.mjs
    const injected = [
      { at: 1000, duration: 400 },
      { at: 3000, duration: 700 },
      { at: 5300, duration: 1200 },
    ];
    expect(report.events).toHaveLength(injected.length);
    report.events.forEach((event, i) => {
      const { at, duration } = injected[i];
      expect(event.slots).toHaveLength(1);
      expect(event.windowStart).toBeLessThanOrEqual(at);
      expect(event.windowEnd).toBeGreaterThanOrEqual(at + duration);
      expect(Math.abs(event.estimatedDurationMs - duration)).toBeLessThan(50);
      expect(event.retrievalCount).toBeGreaterThanOrEqual(3);
    });
  });

  it("rejects the false positives of v1-retail.txt", async () => {
    const reports = (await loadQueryPlans("v1-retail.txt")).map((plan) =>
      detectGcPauses(extractTimingSamples(plan.graph)),
    );
    // Short partitions start and end all along the supposed GCs
    expect(reports.flatMap((report) => report.events)).toEqual([]);
    expect(reports.reduce((sum, report) => sum + report.rejectedByContradiction, 0)).toBe(10);
  });

  it.each(ALL_FIXTURES)("reports consistent events on %s", async (filename) => {
    const { minGapMs, dispersionFactor } = DEFAULT_GC_DETECTION_PARAMS;
    for (const plan of await loadQueryPlans(filename)) {
      const samples = extractTimingSamples(plan.graph);
      const report = detectGcPauses(samples);
      for (const event of report.events) {
        for (const slot of event.slots) {
          const inside = samples.filter((sample) =>
            [sample.start, sample.start + sample.elapsed].some(
              (time) => time > slot.start && time < slot.end,
            ),
          );
          expect(inside).toEqual([]);
        }
        for (const op of event.impacted) {
          if (op.role === "candidate") {
            expect(op.excess).toBeGreaterThanOrEqual(
              Math.max(minGapMs, dispersionFactor * op.sigma),
            );
          } else {
            expect(dispersionFactor * op.sigma).toBeLessThan(event.estimatedDurationMs);
          }
        }
      }
    }
  });
});

import { RetrievalGraph, VirtualRetrievalKind } from "../dataStructures/json/retrieval";

/**
 * Execution of one partition of a retrieval, as recorded in the query plan.
 * Times are in milliseconds, relative to the start of the query plan.
 */
export interface TimingSample {
  retrievalId: number;
  /** `$kind` of the retrieval: aggregate and external retrievals share their ids. */
  kind: string;
  type: string;
  partition: number;
  start: number;
  elapsed: number;
}

/** Tuning of the GC detection. */
export interface GcDetectionParams {
  /** Minimal gap between a partition and the median of its retrieval to suspect a GC. */
  minGapMs: number;
  /** Minimal number of partitions of a retrieval to compute a meaningful median. */
  minPartitions: number;
  /**
   * A concurrent operation confirms a GC of duration D if its own gap is at
   * least `confirmRatio * D` and if it overlaps the GC window for at least
   * `confirmRatio * D`.
   */
  confirmRatio: number;
  /** Minimal number of other operations showing the same gap. */
  minConfirmations: number;
}

export const DEFAULT_GC_DETECTION_PARAMS: Readonly<GcDetectionParams> = {
  minGapMs: 300,
  minPartitions: 3,
  confirmRatio: 0.5,
  minConfirmations: 1,
};

/** A partition impacted by a GC. */
export interface ImpactedOperation extends TimingSample {
  /** Median of the elapsed times of the partitions of the retrieval. */
  median: number;
  /** `elapsed - median`: estimation of the time lost by this partition. */
  excess: number;
  /** `candidate` if the gap exceeds the threshold, `confirmation` otherwise. */
  role: "candidate" | "confirmation";
}

/** A GC pause detected in the plan. */
export interface GcEvent {
  id: number;
  /** Time range in which the GC occurred, relative to the start of the plan. */
  windowStart: number;
  windowEnd: number;
  /** True if the window is shorter than the estimated duration. */
  approximateWindow: boolean;
  /** Median of the gaps of the candidate partitions. */
  estimatedDurationMs: number;
  minGapMs: number;
  maxGapMs: number;
  retrievalCount: number;
  impacted: ImpactedOperation[];
}

export interface GcDetectionReport {
  params: GcDetectionParams;
  analyzedRetrievals: number;
  analyzedSamples: number;
  candidateCount: number;
  events: GcEvent[];
}

/**
 * Extracts the partition timings of the retrievals of a graph, as plain
 * objects that can be sent to a web worker.
 * Retrievals with fewer than `minPartitions` partitions are skipped, as no
 * reference time can be computed for them.
 */
export function extractTimingSamples(
  graph: RetrievalGraph,
  minPartitions = DEFAULT_GC_DETECTION_PARAMS.minPartitions,
): TimingSample[] {
  const samples: TimingSample[] = [];
  for (const vertex of graph.getVertices()) {
    const retrieval = vertex.getMetadata();
    if (retrieval.$kind === VirtualRetrievalKind) {
      continue;
    }
    const { startTime, elapsedTime } = retrieval.timingInfo;
    if (!startTime || !elapsedTime) {
      continue;
    }
    const count = Math.min(startTime.length, elapsedTime.length);
    if (count < minPartitions) {
      continue;
    }
    for (let partition = 0; partition < count; partition++) {
      samples.push({
        retrievalId: retrieval.retrievalId,
        kind: retrieval.$kind,
        type: retrieval.type,
        partition,
        start: startTime[partition],
        elapsed: elapsedTime[partition],
      });
    }
  }
  return samples;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

type MeasuredSample = TimingSample & {
  end: number;
  median: number;
  excess: number;
  key: string;
};

type EventBuilder = {
  windowStart: number;
  windowEnd: number;
  candidates: MeasuredSample[];
};

const retrievalKey = (sample: TimingSample) => `${sample.kind}#${sample.retrievalId}`;

const overlap = (start1: number, end1: number, start2: number, end2: number): number =>
  Math.min(end1, end2) - Math.max(start1, start2);

/** Computes the gap of every partition to the median of its retrieval. */
function measureSamples(
  samples: readonly TimingSample[],
  minPartitions: number,
): { measured: MeasuredSample[]; retrievalCount: number } {
  const byRetrieval = new Map<string, TimingSample[]>();
  for (const sample of samples) {
    const key = retrievalKey(sample);
    const group = byRetrieval.get(key);
    if (group) {
      group.push(sample);
    } else {
      byRetrieval.set(key, [sample]);
    }
  }

  const measured: MeasuredSample[] = [];
  let retrievalCount = 0;
  for (const [key, group] of byRetrieval) {
    if (group.length < minPartitions) {
      continue;
    }
    retrievalCount++;
    const reference = median(group.map((sample) => sample.elapsed));
    for (const sample of group) {
      measured.push({
        ...sample,
        key,
        end: sample.start + sample.elapsed,
        median: reference,
        excess: sample.elapsed - reference,
      });
    }
  }
  return { measured, retrievalCount };
}

/**
 * Groups the candidate partitions into GC events. The most precise candidates
 * (shortest partitions) are placed first. A candidate joins an event if it
 * overlaps its current window enough; the window is then narrowed to the
 * intersection, so that a long partition spanning two GCs does not merge them.
 */
function clusterCandidates(
  candidates: readonly MeasuredSample[],
  confirmRatio: number,
): EventBuilder[] {
  const sorted = [...candidates].sort((a, b) => a.elapsed - b.elapsed || a.start - b.start);
  const events: EventBuilder[] = [];
  for (const candidate of sorted) {
    const event = events.find((e) => {
      const reference = Math.min(candidate.excess, e.candidates[0].excess);
      return (
        overlap(e.windowStart, e.windowEnd, candidate.start, candidate.end) >=
        confirmRatio * reference
      );
    });
    if (event) {
      event.windowStart = Math.max(event.windowStart, candidate.start);
      event.windowEnd = Math.min(event.windowEnd, candidate.end);
      event.candidates.push(candidate);
    } else {
      events.push({
        windowStart: candidate.start,
        windowEnd: candidate.end,
        candidates: [candidate],
      });
    }
  }
  return events;
}

const toImpacted = (
  sample: MeasuredSample,
  role: ImpactedOperation["role"],
): ImpactedOperation => ({
  retrievalId: sample.retrievalId,
  kind: sample.kind,
  type: sample.type,
  partition: sample.partition,
  start: sample.start,
  elapsed: sample.elapsed,
  median: sample.median,
  excess: sample.excess,
  role,
});

/**
 * Detects the GC pauses that slowed down the partitions of a query plan.
 *
 * A GC freezes every operation running at that time. It shows up as a
 * partition much slower than the median of its retrieval (by at least
 * `minGapMs`), while other operations running at the same time show a similar
 * gap. The duration of the GC is estimated by the gap to the median.
 */
export function detectGcPauses(
  samples: readonly TimingSample[],
  params: GcDetectionParams = DEFAULT_GC_DETECTION_PARAMS,
): GcDetectionReport {
  const { minGapMs, minPartitions, confirmRatio, minConfirmations } = params;
  const { measured, retrievalCount } = measureSamples(samples, minPartitions);

  const candidates = measured.filter((sample) => sample.excess >= minGapMs);
  // Only partitions with a significant gap can confirm a GC.
  const significant = measured
    .filter((sample) => sample.excess >= confirmRatio * minGapMs)
    .sort((a, b) => a.start - b.start);

  const events = clusterCandidates(candidates, confirmRatio)
    .map((event) => {
      const gaps = event.candidates.map((sample) => sample.excess);
      const duration = median(gaps);
      const members = new Set<MeasuredSample>(event.candidates);
      for (const sample of significant) {
        if (sample.start >= event.windowEnd) {
          break;
        }
        if (
          !members.has(sample) &&
          sample.excess >= confirmRatio * duration &&
          overlap(event.windowStart, event.windowEnd, sample.start, sample.end) >=
            confirmRatio * Math.min(duration, event.windowEnd - event.windowStart)
        ) {
          members.add(sample);
        }
      }
      return { event, duration, gaps, members };
    })
    .filter(({ members }) => members.size - 1 >= minConfirmations)
    .sort((a, b) => a.event.windowStart - b.event.windowStart)
    .map(({ event, duration, gaps, members }, index): GcEvent => {
      const impacted = Array.from(members)
        .map((sample) =>
          toImpacted(sample, event.candidates.includes(sample) ? "candidate" : "confirmation"),
        )
        .sort((a, b) => a.start - b.start || a.retrievalId - b.retrievalId);
      return {
        id: index + 1,
        windowStart: event.windowStart,
        windowEnd: event.windowEnd,
        approximateWindow: event.windowEnd - event.windowStart < duration,
        estimatedDurationMs: duration,
        minGapMs: Math.min(...gaps),
        maxGapMs: Math.max(...gaps),
        retrievalCount: new Set(Array.from(members, (sample) => sample.key)).size,
        impacted,
      };
    });

  return {
    params: { ...params },
    analyzedRetrievals: retrievalCount,
    analyzedSamples: measured.length,
    candidateCount: candidates.length,
    events,
  };
}

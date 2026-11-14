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
   * A gap is significant only if it exceeds `dispersionFactor` times the
   * robust standard deviation of the partitions of its retrieval.
   */
  dispersionFactor: number;
  /**
   * A concurrent partition confirms a GC of duration D if its own gap is at
   * least `confirmRatio * D`.
   */
  confirmRatio: number;
  /** Minimal number of other partitions showing the same gap. */
  minConfirmations: number;
  /**
   * The GC must fit in a time range of at least `(1 - durationTolerance) * D`
   * in which no partition starts or ends, D being the estimated duration.
   */
  durationTolerance: number;
}

export const DEFAULT_GC_DETECTION_PARAMS: Readonly<GcDetectionParams> = {
  minGapMs: 300,
  minPartitions: 3,
  dispersionFactor: 3,
  confirmRatio: 0.5,
  minConfirmations: 1,
  durationTolerance: 0.2,
};

/** Scale factor turning a median absolute deviation into a standard deviation. */
const MAD_TO_SIGMA = 1.4826;

/** A partition impacted by a GC. */
export interface ImpactedOperation extends TimingSample {
  /** Median of the elapsed times of the partitions of the retrieval. */
  median: number;
  /** Robust standard deviation (1.4826 × MAD) of the elapsed times of the retrieval. */
  sigma: number;
  /** `elapsed - median`: estimation of the time lost by this partition. */
  excess: number;
  /** `excess / sigma`, or null when all the partitions have the same elapsed time. */
  zScore: number | null;
  /** `candidate` if the gap exceeds the threshold, `confirmation` otherwise. */
  role: "candidate" | "confirmation";
}

/** A time range, relative to the start of the plan. */
export interface TimeRange {
  start: number;
  end: number;
}

/** A GC pause detected in the plan. */
export interface GcEvent {
  id: number;
  /** Time range covering every possible position of the GC. */
  windowStart: number;
  windowEnd: number;
  /**
   * Time ranges in which the GC may have occurred: no partition starts or
   * ends in them, and they are long enough to contain the GC.
   */
  slots: TimeRange[];
  /** True if there are several possible positions for the GC. */
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
  /** Number of partitions, of every retrieval, used to check contradictions. */
  totalSamples: number;
  /** Number of retrievals with enough partitions to compute a reference time. */
  analyzedRetrievals: number;
  /** Number of partitions of these retrievals. */
  analyzedSamples: number;
  candidateCount: number;
  /** Groups of candidates rejected because a partition starts or ends during the GC. */
  rejectedByContradiction: number;
  /** Groups of candidates rejected because no other partition shows the gap. */
  unconfirmed: number;
  events: GcEvent[];
}

/**
 * Extracts the partition timings of every retrieval of a graph, as plain
 * objects that can be sent to a web worker.
 */
export function extractTimingSamples(graph: RetrievalGraph): TimingSample[] {
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

/**
 * Robust standard deviation: 1.4826 times the median absolute deviation. It
 * is in the same unit as the values, and is not inflated by a few outliers.
 */
export function robustSigma(values: readonly number[]): number {
  const reference = median(values);
  return MAD_TO_SIGMA * median(values.map((value) => Math.abs(value - reference)));
}

type MeasuredSample = TimingSample & {
  end: number;
  median: number;
  sigma: number;
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

/** Index of the first value of a sorted array strictly greater than `value`. */
function upperBound(sorted: readonly number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] <= value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

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
    const elapsedTimes = group.map((sample) => sample.elapsed);
    const reference = median(elapsedTimes);
    const sigma = robustSigma(elapsedTimes);
    for (const sample of group) {
      measured.push({
        ...sample,
        key,
        end: sample.start + sample.elapsed,
        median: reference,
        sigma,
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

/**
 * Finds the time ranges of the window in which no partition starts or ends,
 * and which are at least `minLength` long. A GC freezes every thread: no
 * partition can start or end while it runs.
 */
function findFreeSlots(
  boundaries: readonly number[],
  windowStart: number,
  windowEnd: number,
  minLength: number,
): TimeRange[] {
  const points = [windowStart];
  for (let i = upperBound(boundaries, windowStart); i < boundaries.length; i++) {
    if (boundaries[i] >= windowEnd) {
      break;
    }
    points.push(boundaries[i]);
  }
  points.push(windowEnd);

  const slots: TimeRange[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i] - points[i - 1] >= minLength) {
      slots.push({ start: points[i - 1], end: points[i] });
    }
  }
  return slots;
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
  sigma: sample.sigma,
  excess: sample.excess,
  zScore: sample.sigma > 0 ? sample.excess / sample.sigma : null,
  role,
});

/**
 * Detects the GC pauses that slowed down the partitions of a query plan.
 *
 * A GC freezes every operation running at that time:
 * - it shows up as a partition much slower than the median of its retrieval,
 *   by at least `minGapMs` and `dispersionFactor` robust standard deviations;
 *   the gap estimates the duration of the GC;
 * - no partition can start or end during the GC: the GC must fit in a time
 *   range free of partition boundaries, or the candidates are rejected;
 * - the other partitions running during the GC must show a similar gap, at
 *   least `minConfirmations` of them. Retrievals whose dispersion is larger
 *   than the GC duration cannot reveal it, and are not used as confirmations.
 */
export function detectGcPauses(
  samples: readonly TimingSample[],
  params: GcDetectionParams = DEFAULT_GC_DETECTION_PARAMS,
): GcDetectionReport {
  const {
    minGapMs,
    minPartitions,
    dispersionFactor,
    confirmRatio,
    minConfirmations,
    durationTolerance,
  } = params;
  const { measured, retrievalCount } = measureSamples(samples, minPartitions);
  const threshold = (sample: MeasuredSample) => Math.max(minGapMs, dispersionFactor * sample.sigma);

  const boundaries = samples
    .flatMap((sample) => [sample.start, sample.start + sample.elapsed])
    .sort((a, b) => a - b);
  const candidates = measured.filter((sample) => sample.excess >= threshold(sample));
  // Only partitions with a significant gap can confirm a GC.
  const significant = measured
    .filter((sample) => sample.excess >= confirmRatio * minGapMs)
    .sort((a, b) => a.start - b.start);

  let rejectedByContradiction = 0;
  let unconfirmed = 0;
  const events = clusterCandidates(candidates, confirmRatio)
    .flatMap((event) => {
      const gaps = event.candidates.map((sample) => sample.excess);
      const duration = median(gaps);
      const slots = findFreeSlots(
        boundaries,
        event.windowStart,
        event.windowEnd,
        Math.max(minGapMs, (1 - durationTolerance) * duration),
      );
      if (slots.length === 0) {
        rejectedByContradiction++;
        return [];
      }

      const members = new Set<MeasuredSample>(event.candidates);
      const windowEnd = slots[slots.length - 1].end;
      for (const sample of significant) {
        if (sample.start >= windowEnd) {
          break;
        }
        const perceptible = dispersionFactor * sample.sigma < duration;
        if (
          !members.has(sample) &&
          perceptible &&
          sample.excess >= Math.max(confirmRatio * duration, dispersionFactor * sample.sigma) &&
          slots.some((slot) => overlap(slot.start, slot.end, sample.start, sample.end) > 0)
        ) {
          members.add(sample);
        }
      }
      if (members.size - 1 < minConfirmations) {
        unconfirmed++;
        return [];
      }
      return [{ event, duration, gaps, slots, members }];
    })
    .sort((a, b) => a.slots[0].start - b.slots[0].start)
    .map(({ event, duration, gaps, slots, members }, index): GcEvent => {
      const impacted = Array.from(members)
        .map((sample) =>
          toImpacted(sample, event.candidates.includes(sample) ? "candidate" : "confirmation"),
        )
        .sort((a, b) => a.start - b.start || a.retrievalId - b.retrievalId);
      return {
        id: index + 1,
        windowStart: slots[0].start,
        windowEnd: slots[slots.length - 1].end,
        slots,
        approximateWindow: slots.length > 1,
        estimatedDurationMs: duration,
        minGapMs: Math.min(...gaps),
        maxGapMs: Math.max(...gaps),
        retrievalCount: new Set(Array.from(members, (sample) => sample.key)).size,
        impacted,
      };
    });

  return {
    params: { ...params },
    totalSamples: samples.length,
    analyzedRetrievals: retrievalCount,
    analyzedSamples: measured.length,
    candidateCount: candidates.length,
    rejectedByContradiction,
    unconfirmed,
    events,
  };
}

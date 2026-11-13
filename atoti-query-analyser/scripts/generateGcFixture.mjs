// Generates e2e/fixtures/gc-pauses-plan.json: a synthetic V2 JSON query plan
// whose timings contain 3 GC pauses, used to test the GC detection.
// The generation is deterministic: run `node scripts/generateGcFixture.mjs`
// to rewrite the fixture after changing this script.
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const OUTPUT = fileURLToPath(new URL("../e2e/fixtures/gc-pauses-plan.json", import.meta.url));

const EXTERNAL_COUNT = 3;
const AGGREGATE_COUNT = 15;
const SLOT_DURATION = 260;

/**
 * GC pauses, in the timeline before any pause is applied. Each pause also
 * delays everything which starts after it, so the actual instants are 1000,
 * 3000 (2600 + 400) and 5300 (4200 + 400 + 700).
 */
export const GC_PAUSES = [
  { at: 1000, duration: 400 },
  { at: 2600, duration: 700 },
  { at: 4200, duration: 1200 },
];

/** Timings of the partitions of the retrieval executed in the given slot. */
function slotTimings(slot) {
  const partitions = 5 + (slot % 4);
  const gap = 110 + (slot % 3) * 15;
  const elapsed = 100 + (slot % 4) * 20;
  return Array.from({ length: partitions }, (_, p) => ({
    start: slot * SLOT_DURATION + p * gap,
    // Noise below 40 ms, far from the 300 ms threshold.
    elapsed: elapsed + ((p * 37 + slot * 13) % 40),
  }));
}

/** Applies the pauses, the latest first, so their instants stay valid. */
function applyGcPauses(timings) {
  for (const { at, duration } of [...GC_PAUSES].reverse()) {
    for (const timing of timings) {
      if (timing.start >= at) {
        timing.start += duration;
      } else if (timing.start + timing.elapsed > at) {
        timing.elapsed += duration;
      }
    }
  }
}

const location = [
  {
    dimension: "Geography",
    hierarchy: "City",
    level: ["ALL", "City"],
    path: ["AllMember", "*"],
  },
];

// Slots 0 to 2 are the external retrievals, slots 3 to 17 the aggregate
// retrievals, the aggregate retrieval 0 (root of the plan) being the last one.
const slots = Array.from({ length: EXTERNAL_COUNT + AGGREGATE_COUNT }, (_, slot) =>
  slotTimings(slot),
);
applyGcPauses(slots.flat());

const timingInfo = (timings) => ({
  startTime: timings.map((t) => t.start),
  elapsedTime: timings.map((t) => t.elapsed),
});

const externalRetrievals = Array.from({ length: EXTERNAL_COUNT }, (_, id) => ({
  retrievalId: id,
  store: `Store${id}`,
  fields: ["City", "Amount"],
  joinedMeasure: [],
  condition: "TRUE",
  resultSizes: slots[id].map((_, p) => 100 + p),
  timingInfo: timingInfo(slots[id]),
}));

const aggregateSlot = (id) => EXTERNAL_COUNT + AGGREGATE_COUNT - 1 - id;
const aggregateRetrievals = Array.from({ length: AGGREGATE_COUNT }, (_, id) => {
  const timings = slots[aggregateSlot(id)];
  return {
    retrievalId: id,
    partialProviderName: "N/A",
    type: id === 0 ? "PostProcessedAggregatesRetrieval" : "PrimitiveAggregatesRetrieval",
    partitioning: `hash${timings.length}(City)`,
    location,
    measures: [`Measure${id}`],
    filterId: 0,
    measureProvider: "SimpleMeasuresProvider",
    underlyingDataNodes: [],
    resultSizes: timings.map((_, p) => 10 + p),
    timingInfo: timingInfo(timings),
  };
});

// Each aggregate retrieval depends on the two previous ones in time.
const dependencies = { "-1": [0] };
for (let id = 0; id < AGGREGATE_COUNT; id++) {
  const deps = [id + 1, id + 2].filter((dep) => dep < AGGREGATE_COUNT);
  if (deps.length > 0) {
    dependencies[id] = deps;
  }
}
// The earliest aggregate retrievals read the external retrievals.
const externalDependencies = {
  [AGGREGATE_COUNT - 1]: [0, 1],
  [AGGREGATE_COUNT - 2]: [1, 2],
  [AGGREGATE_COUNT - 3]: [2],
};

const end = Math.max(...slots.flat().map((t) => t.start + t.elapsed));
const plan = {
  planInfo: {
    pivotType: "ActivePivotVersion",
    pivotId: "GcCube",
    epoch: "1",
    branch: "master",
    retrieverType: "ActivePivotAggregatesRetriever",
    mdxPass: "SelectPass_0",
    contextValues: {},
    rangeSharing: 1000000,
    missedPrefetchBehavior: "WARN",
    aggregatesCache: "None",
    globalTimings: {
      executionContextCreationTime: 0,
      finalizationTime: 1,
      planningTime: 2,
      queryExecutionTime: end,
    },
    continuous: false,
  },
  aggregateRetrievals,
  externalRetrievals,
  dependencies,
  externalDependencies,
  queryFilters: [{ id: 0, description: "CubeFilter with all access" }],
  querySummary: {
    measures: aggregateRetrievals.flatMap((r) => r.measures),
    partialProviders: [],
    totalRetrievals: AGGREGATE_COUNT,
    retrievalsCountByType: {
      PostProcessedAggregatesRetrieval: 1,
      PrimitiveAggregatesRetrieval: AGGREGATE_COUNT - 1,
    },
    partitioningCountByType: {},
    resultSizeByPartitioning: {},
    totalExternalResultSize: externalRetrievals
      .flatMap((r) => r.resultSizes)
      .reduce((a, b) => a + b, 0),
  },
};

writeFileSync(OUTPUT, `${JSON.stringify({ status: "success", data: [plan] }, null, 2)}\n`);
console.log(`Wrote ${OUTPUT}`);

import { describe, it, expect } from "vitest";
import {
  compareNodes,
  computeArrayDiff,
  computeLocationDiff,
} from "library/comparison/nodeComparison";
import {
  AggregateRetrieval,
  ExternalRetrieval,
} from "library/dataStructures/json/retrieval";
import { CubeLocation } from "library/dataStructures/json/cubeLocation";

const location = (
  hierarchy: string,
  level: string[],
  path: unknown[],
): CubeLocation => ({ dimension: "Dim", hierarchy, level, path });

const aggregate = (
  overrides: Partial<AggregateRetrieval>,
): AggregateRetrieval => ({
  $kind: "AggregateRetrieval",
  type: "PrimitiveAggregatesRetrieval",
  retrievalId: 0,
  timingInfo: {},
  partialProviderName: "JIT",
  partitioning: "Constant",
  location: [],
  measures: [],
  filterId: 0,
  measureProvider: "SimpleMeasuresProvider",
  underlyingDataNodes: [],
  resultSizes: [],
  ...overrides,
});

const external: ExternalRetrieval = {
  $kind: "ExternalRetrieval",
  type: "DatabaseRetrieval",
  retrievalId: 1,
  timingInfo: {},
  store: "Trades",
  fields: [],
  joinedMeasure: ["price.SUM"],
  condition: "",
  resultSizes: [],
};

describe("computeArrayDiff", () => {
  it("lists common values first, then the ones of each side", () => {
    expect(computeArrayDiff(["a", "b", "c"], ["c", "d", "a"])).toEqual([
      { value: "a", status: "same" },
      { value: "c", status: "same" },
      { value: "b", status: "left-only" },
      { value: "d", status: "right-only" },
    ]);
  });
});

describe("computeLocationDiff", () => {
  it("compares the levels of each hierarchy", () => {
    const left = [
      location("Currency", ["ALL", "Currency"], ["AllMember", "EUR"]),
      location("Date", ["ALL", "Year"], ["AllMember", 2024]),
      location("Book", ["ALL", "Book"], ["AllMember", ["A", "B"]]),
    ];
    const right = [
      location("Currency", ["ALL", "Currency"], ["AllMember", "USD"]),
      location("Desk", ["ALL", "Desk"], ["AllMember", null]),
      location("Book", ["ALL", "Book"], ["AllMember", ["A", "B"]]),
    ];
    const diff = computeLocationDiff(left, right);
    expect(diff.map(({ key, status }) => ({ key, status }))).toEqual([
      { key: "Dim:Book", status: "same" },
      { key: "Dim:Currency", status: "different" },
      { key: "Dim:Date", status: "left-only" },
      { key: "Dim:Desk", status: "right-only" },
    ]);
    const currency = diff[1];
    expect(currency.levels).toHaveLength(1);
    expect(currency.levels[0]).toMatchObject({
      levelName: "Currency",
      levelIndex: 1,
      leftPath: JSON.stringify("EUR"),
      rightPath: JSON.stringify("USD"),
      status: "different",
    });
  });

  it("compares levels missing on one side", () => {
    const [diff] = computeLocationDiff(
      [location("Date", ["ALL", "Year", "Month"], ["AllMember", 2024, 1])],
      [location("Date", ["ALL", "Year"], ["AllMember", 2024])],
    );
    expect(diff.status).toBe("different");
    expect(diff.levels.map((level) => level.status)).toEqual([
      "same",
      "left-only",
    ]);
  });
});

describe("compareNodes", () => {
  it("reports identical retrievals as the same", () => {
    const retrieval = aggregate({ measures: ["pnl.SUM"] });
    const result = compareNodes(retrieval, retrieval);
    expect(result.type.status).toBe("same");
    expect(result.partitioning.status).toBe("same");
    expect(result.measures).toEqual([{ value: "pnl.SUM", status: "same" }]);
  });

  it("reports the differences between two aggregate retrievals", () => {
    const result = compareNodes(
      aggregate({
        measures: ["pnl.SUM"],
        partitioning: "Constant",
        filterId: 1,
      }),
      aggregate({
        type: "JITPrimitiveAggregatesRetrieval",
        measures: ["delta.SUM"],
        partitioning: "hash(Book)",
        filterId: 1,
      }),
    );
    expect(result.type.status).toBe("different");
    expect(result.partitioning.status).toBe("different");
    expect(result.filterId.status).toBe("same");
    expect(result.measures.map((item) => item.status)).toEqual([
      "left-only",
      "right-only",
    ]);
  });

  it("compares an aggregate retrieval with an external retrieval", () => {
    const result = compareNodes(aggregate({ measures: ["pnl.SUM"] }), external);
    expect(result.type.status).toBe("different");
    expect(result.partitioning.status).toBe("left-only");
    expect(result.measures.map((item) => item.status)).toEqual([
      "left-only",
      "right-only",
    ]);

    const reversed = compareNodes(external, external);
    expect(reversed.partitioning.status).toBe("na");
    expect(reversed.measures).toEqual([{ value: "price.SUM", status: "same" }]);
  });
});

import { describe, it, expect } from "vitest";
import {
  abbreviation,
  extractWords,
  humanisticStringComparator,
  prettySize,
} from "library/utilities/textUtils";
import { asError, computeIfAbsent, requireNonNull } from "library/utilities/util";
import { generateUUID } from "library/utilities/uuid";
import { type } from "library/graphView/labels";
import { extractLabel } from "library/storage/recentQueryPlans";

describe("textUtils", () => {
  it.each([
    ["fooBarHTML", ["foo", "Bar", "HTML"]],
    ["fooBarHTMLEntity01AB23", ["foo", "Bar", "HTML", "Entity", "01", "AB", "23"]],
    [
      "___Foo_bar_HTMLEntity   QwertyUiop foo_bar_quux",
      ["Foo", "bar", "HTML", "Entity", "Qwerty", "Uiop", "foo", "bar", "quux"],
    ],
    ["", []],
  ])("extracts the words of %j", (text, words) => {
    expect(extractWords(text)).toEqual(words);
  });

  it("abbreviates identifiers", () => {
    expect(abbreviation("PostProcessedAggregatesRetrieval")).toBe("PPAR");
    expect(abbreviation("primitive_results_merger")).toBe("PRM");
  });

  it("compares identifiers word by word, ignoring the case", () => {
    expect(humanisticStringComparator("fooBar", "FOO_BAR")).toBe(0);
    expect(humanisticStringComparator("alpha", "beta")).toBeLessThan(0);
    expect(humanisticStringComparator("beta", "alpha")).toBeGreaterThan(0);
  });

  it.each([
    [0, "0 bytes"],
    [1024, "1024 bytes"],
    [1536, "1.5 KiB"],
    [5 * 1024 * 1024, "5.0 MiB"],
    [3 * 1024 ** 3, "3.0 GiB"],
    [2 * 1024 ** 5, "2048.0 TiB"],
  ])("formats %d as %s", (size, expected) => {
    expect(prettySize(size)).toBe(expected);
  });
});

describe("util", () => {
  it("requires non null values", () => {
    expect(requireNonNull(0)).toBe(0);
    expect(() => requireNonNull(null)).toThrow("Unexpected null or undefined");
    expect(() => requireNonNull(undefined)).toThrow();
  });

  it("computes a missing value only once", () => {
    const map = new Map<string, number>();
    let calls = 0;
    const supplier = () => ++calls;
    expect(computeIfAbsent(map, "a", supplier)).toBe(1);
    expect(computeIfAbsent(map, "a", supplier)).toBe(1);
    expect(calls).toBe(1);
    expect(map.get("a")).toBe(1);
  });

  it("wraps thrown values into errors", () => {
    const error = new Error("boom");
    expect(asError(error)).toBe(error);
    expect(asError("boom")).toEqual(new Error("boom"));
  });

  it("generates distinct UUIDs", () => {
    expect(generateUUID()).not.toBe(generateUUID());
  });
});

describe("labels", () => {
  it("gives a readable label to the known retrieval types", () => {
    expect(type("PrimitiveResultsMerger")).toBe("Merger");
    expect(type("JITPrimitiveAggregatesRetrieval")).toBe("JIT Retrieval");
  });

  it("keeps the class name of the unknown retrieval types", () => {
    expect(type("SomethingNew")).toBe("<SomethingNew>");
  });
});

describe("extractLabel", () => {
  it("falls back to a default label", () => {
    expect(extractLabel({})).toBe("Query plan");
    expect(extractLabel([])).toBe("Query plan");
    expect(extractLabel([{}])).toBe("Query plan");
    expect(extractLabel([{ planInfo: {} }])).toBe("Query plan");
  });

  it("uses the cube and the pass of the first plan", () => {
    expect(extractLabel([{ planInfo: { pivotId: "Cube", mdxPass: "Select_0" } }])).toBe(
      "Cube - Select_0",
    );
    expect(
      extractLabel([{ planInfo: { pivotId: "Cube" } }, { planInfo: {} }, { planInfo: {} }]),
    ).toBe("Cube (+2 more)");
  });
});

import fs from "fs";
import path from "path";
import { convertToV2, parseMultiV1 } from "library/inputProcessors/v1tov2";
import {
  preprocessQueryPlan,
  QueryPlan,
} from "library/dataStructures/processing/queryPlan";

const FIXTURES_DIR = path.resolve(__dirname, "../../../e2e/fixtures");

export const V1_FIXTURES = [
  "small-plan-v1.txt",
  "v1-sample-1.txt",
  "v1-sample-2.txt",
  "v1-no-space.txt",
  "v1-external-retrievals.txt",
  "v1-large-plan.txt",
  "v1-retail.txt",
  "6.1-in-v1.txt",
];

export const JSON_FIXTURES = [
  "larger-distributed-query.json",
  "larger-distribution-query2.json",
  "query-with-external-retrievals.json",
  "range-location-path-plan.json",
  "no-data-key-format.json",
];

export const ALL_FIXTURES = [...JSON_FIXTURES, ...V1_FIXTURES];

export function loadFixture(filename: string): string {
  const filePath = path.join(FIXTURES_DIR, filename);
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Return the raw JSON query plans of a fixture, converting V1 text plans to V2 JSON.
 */
export async function loadRawJsonPlans(filename: string): Promise<unknown[]> {
  const content = loadFixture(filename);
  if (filename.endsWith(".json")) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.data;
  }
  const v1Structures = await parseMultiV1(content, () => {});
  return v1Structures.map((structure) => convertToV2(structure).result);
}

/**
 * Load a fixture and process it into query plans, as the application does.
 */
export async function loadQueryPlans(filename: string): Promise<QueryPlan[]> {
  return preprocessQueryPlan(await loadRawJsonPlans(filename));
}

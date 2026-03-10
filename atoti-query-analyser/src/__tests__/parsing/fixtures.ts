import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../cypress/fixtures/exports",
);

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

export function loadFixture(filename: string): string {
  const filePath = path.join(FIXTURES_DIR, filename);
  return fs.readFileSync(filePath, "utf-8");
}

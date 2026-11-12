// Print the coverage of the whole application and of src/library, from the json-summary report of Vitest.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const summaryPath = fileURLToPath(
  new URL("../coverage/coverage-summary.json", import.meta.url),
);
const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
const metrics = ["statements", "branches", "functions", "lines"];

function aggregate(predicate) {
  const totals = Object.fromEntries(
    metrics.map((metric) => [metric, { covered: 0, total: 0 }]),
  );
  for (const [file, fileSummary] of Object.entries(summary)) {
    if (file === "total" || !predicate(file.replaceAll("\\", "/"))) {
      continue;
    }
    for (const metric of metrics) {
      totals[metric].covered += fileSummary[metric].covered;
      totals[metric].total += fileSummary[metric].total;
    }
  }
  return totals;
}

const scopes = {
  "src (all)": aggregate(() => true),
  "src/library": aggregate((file) => file.includes("/src/library/")),
};

const pad = (text, width) => String(text).padEnd(width);
console.log(
  `\n${pad("Coverage", 14)}${metrics.map((metric) => pad(metric, 12)).join("")}`,
);
for (const [scope, totals] of Object.entries(scopes)) {
  const cells = metrics.map((metric) => {
    const { covered, total } = totals[metric];
    const percentage = total === 0 ? 100 : (100 * covered) / total;
    return pad(`${percentage.toFixed(2)}%`, 12);
  });
  console.log(`${pad(scope, 14)}${cells.join("")}`);
}

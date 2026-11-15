import { expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

/** Panels of the top menu, in the order they are visited. */
export const PANELS = [
  "Summary",
  "Passes diagram",
  "Graph",
  "Partitions",
  "Timeline",
  "Input",
] as const;

/** Lists the fixture files, sorted by name. */
export function listFixtures(): string[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((file) => /\.(json|txt)$/.test(file))
    .sort();
}

/** Input mode of a fixture, deduced from its extension. */
export function inputModeOf(file: string): "JSON" | "V1" {
  return file.endsWith(".json") ? "JSON" : "V1";
}

/** Problems reported by the browser while a test runs. */
export interface IssueWatcher {
  /** Collected messages, prefixed by the step during which they occurred. */
  issues: string[];
  /** Current step of the test, used to label the collected messages. */
  step: string;
}

/**
 * Collects the problems reported by the browser: uncaught exceptions and
 * `console.error` calls.
 */
export function watchIssues(page: Page): IssueWatcher {
  const watcher: IssueWatcher = { issues: [], step: "start" };
  page.on("pageerror", (error) => {
    watcher.issues.push(`[${watcher.step}] pageerror: ${error.stack ?? error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      const { url, lineNumber } = message.location();
      watcher.issues.push(
        `[${watcher.step}] console.error: ${message.text()} (${url}:${lineNumber})`,
      );
    }
  });
  return watcher;
}

/**
 * Asserts that the application does not display any error: no error boundary
 * fallback, no "load a plan first" stub and no error notification.
 * Informative notifications (e.g. "Graph filter") are tolerated.
 */
export async function expectNoAppIssue(page: Page) {
  await expect(page.getByText("Oops! Something went wrong")).toHaveCount(0);
  await expect(page.getByText("Load a query plan first!")).toHaveCount(0);
  await expect(page.locator(".toast", { hasText: "An error occurred" })).toHaveCount(0);
}

/** Opens a panel from the top menu. */
export async function openPanel(page: Page, panel: string) {
  await page.locator(".navbar-nav").getByText(panel, { exact: true }).click();
}

/**
 * Loads a fixture through the "File upload" source, processes it and waits for
 * the Summary panel, displayed once the plan is parsed.
 */
export async function loadFixture(page: Page, file: string) {
  const filePath = path.join(FIXTURES_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  await page.locator('input[type="radio"][value="File upload"]').check();
  await page.locator('input[type="file"]').setInputFiles(filePath);
  // The file is read asynchronously: wait for its content to be in the form
  await expect(page.getByText(`Data size: ${content.length} (`)).toBeVisible();

  await page.locator(`input[type="radio"][value="${inputModeOf(file)}"]`).check();
  await page.getByRole("button", { name: "Process", exact: true }).click();

  await expect(page.locator("#summary")).toBeVisible({ timeout: 60_000 });
}

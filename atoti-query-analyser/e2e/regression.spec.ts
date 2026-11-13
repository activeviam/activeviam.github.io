import { expect, test } from "@playwright/test";
import { expectNoAppIssue, loadFixture, watchIssues } from "./helpers";

test.describe("Summary view", () => {
  test("displays measures even if not many", async ({ page }) => {
    await page.goto("/");
    await loadFixture(page, "small-plan-v1.txt");

    await expect(page.getByText("ChunkSize.SUM").first()).toBeVisible();
  });
});

test.describe("GC detection", () => {
  test("finds the 3 GC pauses of the synthetic plan", async ({ page }) => {
    const watcher = watchIssues(page);
    await page.goto("/");
    await loadFixture(page, "gc-pauses-plan.json");

    await page.getByRole("button", { name: "Detect GC pauses" }).click();

    const events = page.locator("table.gc-events tr.gc-event");
    await expect(events).toHaveCount(3);
    await expect(events.nth(0)).toContainText("408 ms");
    await expect(events.nth(1)).toContainText("702 ms");
    await expect(events.nth(2)).toContainText("1201 ms");

    // A click on an event lists its impacted operations
    await events.nth(2).click();
    await expect(page.locator("table.gc-impacted tbody tr")).toHaveCount(4);

    await expectNoAppIssue(page);
    expect(watcher.issues).toEqual([]);
  });
});

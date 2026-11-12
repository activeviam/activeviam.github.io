import { expect, test } from "@playwright/test";
import { loadFixture } from "./helpers";

test.describe("Summary view", () => {
  test("displays measures even if not many", async ({ page }) => {
    await page.goto("/");
    await loadFixture(page, "small-plan-v1.txt");

    await expect(page.getByText("ChunkSize.SUM").first()).toBeVisible();
  });
});

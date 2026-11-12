import { expect, test } from "@playwright/test";
import {
  expectNoAppIssue,
  listFixtures,
  loadFixture,
  openPanel,
  PANELS,
  watchIssues,
} from "./helpers";
import { KNOWN_FAILURES } from "./knownFailures";

const fixtures = listFixtures();

test("fixtures are found", () => {
  expect(fixtures.length).toBeGreaterThan(0);
});

test.describe("Fixtures", () => {
  for (const file of fixtures) {
    test(`${file}: loads and opens every panel`, async ({ page }) => {
      const knownIssue = KNOWN_FAILURES[file];
      test.fail(knownIssue !== undefined, knownIssue);

      const watcher = watchIssues(page);

      await page.goto("/");
      await test.step("load the fixture", async () => {
        watcher.step = "load";
        await loadFixture(page, file);
        await expectNoAppIssue(page);
      });

      for (const panel of PANELS) {
        await test.step(`open ${panel}`, async () => {
          watcher.step = panel;
          await openPanel(page, panel);
          await expectNoAppIssue(page);
        });
      }

      expect(watcher.issues).toEqual([]);
    });
  }
});

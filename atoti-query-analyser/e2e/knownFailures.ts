/**
 * Fixtures for which the application currently reports an issue.
 * The matching tests are marked with `test.fail`: they will turn red as soon as
 * the issue is fixed, as a reminder to remove the entry from this list.
 *
 * Key: fixture file name. Value: observed issue.
 */
const DUPLICATE_NOTIFICATION_KEY =
  "Opening Graph shows the 'Graph filter' notification (graph >= 100 vertices). " +
  "NotificationWrapper freezes newMessage in useState, so every message gets id 0 " +
  "and React logs 'Encountered two children with the same key'.";

export const KNOWN_FAILURES: Record<string, string> = {
  "6.1-in-v1.txt": DUPLICATE_NOTIFICATION_KEY,
  "query-with-external-retrievals.json": DUPLICATE_NOTIFICATION_KEY,
  "v1-large-plan.txt": DUPLICATE_NOTIFICATION_KEY,
};

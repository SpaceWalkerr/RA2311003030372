const assert = require("assert");
const { getTopNotifications } = require("./priorityInbox");

const result = getTopNotifications([
  { ID: "1", Type: "Event", Message: "event", Timestamp: "2026-04-22 17:51:06" },
  { ID: "2", Type: "Placement", Message: "placement", Timestamp: "2026-04-22 17:49:42" },
  { ID: "3", Type: "Result", Message: "result", Timestamp: "2026-04-22 17:51:30" },
  { ID: "4", Type: "Placement", Message: "new placement", Timestamp: "2026-04-22 17:51:18" },
], 3);

assert.deepStrictEqual(
  result.map((item) => item.id),
  ["4", "2", "3"]
);

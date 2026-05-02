const assert = require("assert");
const { scheduleMaintenance } = require("./scheduler");

const result = scheduleMaintenance(
  [
    { TaskID: "A", Duration: 2, Impact: 10 },
    { TaskID: "B", Duration: 3, Impact: 14 },
    { TaskID: "C", Duration: 4, Impact: 16 },
    { TaskID: "D", Duration: 5, Impact: 30 },
  ],
  7
);

assert.strictEqual(result.totalScore, 40);
assert.deepStrictEqual(
result.selectedTasks.map((task) => task.id),
  ["A", "D"]
);

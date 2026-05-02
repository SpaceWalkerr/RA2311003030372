function normalizeTask(rawTask, index) {
  const id = rawTask.TaskID || `task-${index + 1}`;
  const duration = Number(rawTask.Duration);
  const score = Number(rawTask.Impact);

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error(`Invalid duration for ${id}`);
  }

  if (!Number.isInteger(score) || score < 0) {
    throw new Error(`Invalid score for ${id}`);
  }

  return {
    id,
    duration,
    score,
    raw: rawTask,
  };
}

function scheduleMaintenance(rawTasks, rawBudget) {
  if (!Array.isArray(rawTasks)) {
    throw new Error("Tasks must be an array");
  }

  const budget = Number(rawBudget);

  if (!Number.isInteger(budget) || budget <= 0) {
    throw new Error("Budget must be a positive integer");
  }

  const tasks = rawTasks.map(normalizeTask);
  const dp = Array.from({ length: tasks.length + 1 }, () => Array(budget + 1).fill(0));

  for (let i = 1; i <= tasks.length; i += 1) {
    const task = tasks[i - 1];

    for (let hour = 0; hour <= budget; hour += 1) {
      dp[i][hour] = dp[i - 1][hour];

      if (task.duration <= hour) {
        const scoreWithTask = task.score + dp[i - 1][hour - task.duration];
        dp[i][hour] = Math.max(dp[i][hour], scoreWithTask);
      }
    }
  }

  const selectedTasks = [];
  let remainingHours = budget;

  for (let i = tasks.length; i > 0; i -= 1) {
    if (dp[i][remainingHours] !== dp[i - 1][remainingHours]) {
      const task = tasks[i - 1];
      selectedTasks.push(task);
      remainingHours -= task.duration;
    }
  }

  selectedTasks.reverse();

  const totalDuration = selectedTasks.reduce((sum, task) => sum + task.duration, 0);
  const totalScore = selectedTasks.reduce((sum, task) => sum + task.score, 0);

  return {
    budget,
    totalDuration,
    totalScore: dp[tasks.length][budget],
    selectedCount: selectedTasks.length,
    selectedTasks,
  };
}

module.exports = {
  scheduleMaintenance,
};

const LOG_API_URL = "http://20.207.122.201/evaluation-service/logs";

const VALID_STACKS = new Set(["backend", "frontend"]);
const VALID_LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);
const VALID_BACKEND_PACKAGES = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
]);
const VALID_FRONTEND_PACKAGES = new Set([
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
]);
const VALID_SHARED_PACKAGES = new Set(["auth", "config", "middleware", "utils"]);

function isValidPackage(stack, packageName) {
  if (VALID_SHARED_PACKAGES.has(packageName)) {
    return true;
  }

  if (stack === "backend") {
    return VALID_BACKEND_PACKAGES.has(packageName);
  }

  if (stack === "frontend") {
    return VALID_FRONTEND_PACKAGES.has(packageName);
  }

  return false;
}

function validateLogInput(stack, level, packageName, message) {
  if (!VALID_STACKS.has(stack)) {
    throw new Error('Invalid stack. Use "backend" or "frontend".');
  }

  if (!VALID_LEVELS.has(level)) {
    throw new Error('Invalid level. Use "debug", "info", "warn", "error", or "fatal".');
  }

  if (!isValidPackage(stack, packageName)) {
    throw new Error(`Invalid package "${packageName}" for ${stack}.`);
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Message must be a non-empty string.");
  }
}

async function Log(stack, level, packageName, message) {
  validateLogInput(stack, level, packageName, message);

  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    throw new Error("ACCESS_TOKEN environment variable is required.");
  }

  const response = await fetch(LOG_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      stack,
      level,
      package: packageName,
      message,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Log API failed with status ${response.status}`);
  }

  return data;
}

module.exports = {
  Log,
};

const fs = require("fs");
const path = require("path");
const { Log } = require("../logging_middleware");
const { getTopNotifications } = require("./priorityInbox");

const API_URL = "http://20.207.122.201/evaluation-service/notifications";

async function appLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
  }
}

async function fetchNotifications() {
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    throw new Error("ACCESS_TOKEN is required");
  }

  await appLog("info", "service", "fetching notifications");

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    await appLog("error", "service", "notification api failed");
    throw new Error(data.message || "Notification API failed");
  }

  return data.notifications || [];
}

async function main() {
  const notifications = await fetchNotifications();
  const topNotifications = getTopNotifications(notifications, 10);
  const filePath = path.join(__dirname, "output.json");

  fs.writeFileSync(filePath, JSON.stringify(topNotifications, null, 2));
  await appLog("info", "service", "top notifications saved");
}

main().catch(async (error) => {
  await appLog("fatal", "handler", error.message);
  process.exit(1);
});

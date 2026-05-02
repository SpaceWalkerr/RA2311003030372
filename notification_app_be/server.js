const http = require("http");
const { Log } = require("../logging_middleware");
const { getTopNotifications } = require("./priorityInbox");

const PORT = process.env.PORT || 4000;
const API_URL = "http://20.207.122.201/evaluation-service/notifications";

async function appLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(data, null, 2));
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

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      await appLog("debug", "route", "health route called");
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/priority-inbox") {
      const limit = Number(url.searchParams.get("limit") || 10);
      const notifications = await fetchNotifications();
      const topNotifications = getTopNotifications(notifications, limit);

      await appLog("info", "route", "priority inbox route called");
      sendJson(response, 200, {
        count: topNotifications.length,
        notifications: topNotifications,
      });
      return;
    }

    await appLog("warn", "route", "route not found");
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    await appLog("error", "handler", error.message);
    sendJson(response, 500, { error: error.message });
  }
}

http.createServer(handleRequest).listen(PORT, async () => {
  await appLog("info", "service", `server started on port ${PORT}`);
});

const http = require("http");
const { Log } = require("../logging_middleware");
const { scheduleMaintenance } = require("./scheduler");

const PORT = process.env.PORT || 3000;
const BASE_URL = "http://20.207.122.201/evaluation-service";

async function appLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getData(path) {
  const token = process.env.AFFORDMED_ACCESS_TOKEN;

  if (!token) {
    throw new Error("AFFORDMED_ACCESS_TOKEN is required");
  }

  await appLog("info", "service", `fetching ${path}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    await appLog("error", "service", `${path} api failed`);
    throw new Error(data.message || "API request failed");
  }

  return data;
}

async function makeSchedule(depotId) {
  const depotData = await getData("/depots");
  const vehicleData = await getData("/vehicles");
  const depots = depotData.depots || [];
  const vehicles = vehicleData.vehicles || [];

  await appLog("debug", "service", `depots ${depots.length}, vehicles ${vehicles.length}`);

  if (depotId) {
    const depot = depots.find((item) => String(item.ID) === String(depotId));

    if (!depot) {
      throw new Error("Depot not found");
    }

    return {
      depotId: depot.ID,
      ...scheduleMaintenance(vehicles, depot.MechanicHours),
    };
  }

  return depots.map((depot) => ({
    depotId: depot.ID,
    ...scheduleMaintenance(vehicles, depot.MechanicHours),
  }));
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      await appLog("debug", "route", "health route called");
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/depots") {
      await appLog("info", "route", "depots route called");
      const depots = await getData("/depots");
      sendJson(response, 200, depots);
      return;
    }

    if (request.method === "GET" && url.pathname === "/vehicles") {
      await appLog("info", "route", "vehicles route called");
      const vehicles = await getData("/vehicles");
      sendJson(response, 200, vehicles);
      return;
    }

    if (request.method === "POST" && url.pathname === "/schedule") {
      await appLog("info", "route", "schedule route called");
      const payload = await readBody(request);
      const result = payload.tasks
        ? scheduleMaintenance(payload.tasks, payload.budget)
        : await makeSchedule(payload.depotId);
      sendJson(response, 200, result);
      return;
    }

    await appLog("warn", "route", `route not found ${request.method} ${url.pathname}`);
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    await appLog("error", "handler", error.message);
    sendJson(response, 500, { error: error.message });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, async () => {
  await appLog("info", "service", `server started on port ${PORT}`);
});

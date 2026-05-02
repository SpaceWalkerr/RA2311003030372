const fs = require("fs");
const path = require("path");
const { Log } = require("../logging_middleware");
const { scheduleMaintenance } = require("./scheduler");

const BASE_URL = "http://20.207.122.201/evaluation-service";

async function appLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch {
  }
}

async function getData(apiPath) {
  const token = process.env.AFFORDMED_ACCESS_TOKEN;

  if (!token) {
    throw new Error("AFFORDMED_ACCESS_TOKEN is required");
  }

  const response = await fetch(`${BASE_URL}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}

async function main() {
  await appLog("info", "service", "scheduler started");

  const depotData = await getData("/depots");
  const vehicleData = await getData("/vehicles");
  const depots = depotData.depots || [];
  const vehicles = vehicleData.vehicles || [];

  const result = depots.map((depot) => ({
    depotId: depot.ID,
    ...scheduleMaintenance(vehicles, depot.MechanicHours),
  }));

  const outputPath = path.join(__dirname, "output.json");

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  await appLog("info", "service", "schedule output written to file");
}

main().catch(async (error) => {
  await appLog("fatal", "handler", error.message);
  process.exit(1);
});

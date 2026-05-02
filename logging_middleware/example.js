const { Log } = require("./index");

async function main() {
  await Log(
    "backend",
    "error",
    "handler",
    "received string, expected bool"
  );
}

main().catch((error) => {
  process.exit(1);
});

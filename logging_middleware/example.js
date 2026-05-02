const { Log } = require("./index");

async function main() {
  const result = await Log(
    "backend",
    "error",
    "handler",
    "received string, expected bool"
  );

  console.log(result);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

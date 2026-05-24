const config = require("./config");
const createApp = require("./app");
const { createRuntimeContext } = require("./runtime");
const { seedDatabase } = require("./seed/seedDatabase");

async function main() {
  const context = await createRuntimeContext();
  if (context.store.kind === "memory") {
    await seedDatabase(context.store);
  }
  const app = createApp(context);
  const server = app.listen(config.port, () => {
    console.log(`Valkey e-commerce API listening on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down API");
    server.close(async () => {
      await context.store.quit();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

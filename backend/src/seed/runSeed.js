const { createStore } = require("../lib/valkey");
const { seedDatabase } = require("./seedDatabase");

async function main() {
  const store = await createStore();
  const result = await seedDatabase(store);
  console.log(
    `Seed complete: ${result.products} products, ${result.categories} categories, ${result.coupons} coupons, ${result.users} demo user, search=${result.search}`
  );
  await store.quit();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const bcrypt = require("bcryptjs");
const { categories, products, coupons } = require("./data");
const { createRepositories } = require("../repositories");

async function seedDatabase(store) {
  const repos = createRepositories(store);

  for (const category of categories) {
    const children = categories.filter((item) => item.parentId === category.id).map((item) => item.id);
    await repos.categories.save(category.id, { ...category, children });
  }

  for (const product of products) {
    await repos.products.save(product.id, product);
    await store.hSet(`inventory:${product.id}`, {
      quantity: String(product.inventory.quantity),
      reserved: String(product.inventory.reserved)
    });
    if (store.capabilities?.search) {
      try {
        await store.sendCommand(["FT.SUGADD", "autocomplete", product.name, "1"]);
      } catch (error) {}
    }
  }

  for (const coupon of coupons) {
    await repos.coupons.save(coupon.code, coupon);
  }

  const existingUser = await store.get("user_email:demo@valkey.local");
  if (!existingUser) {
    const user = {
      id: "user:demo",
      email: "demo@valkey.local",
      passwordHash: await bcrypt.hash("ValkeyDemo123", 12),
      firstName: "Demo",
      lastName: "Shopper",
      role: "customer",
      createdAt: new Date().toISOString()
    };
    await repos.users.save(user.id, user);
    await store.set("user_email:demo@valkey.local", user.id);
  }

  await ensureSearchIndex(store);

  return {
    categories: categories.length,
    products: products.length,
    coupons: coupons.length,
    users: 1,
    search: store.capabilities?.search ? "available" : "fallback"
  };
}

async function ensureSearchIndex(store) {
  if (!store.capabilities?.search) return false;
  try {
    const indexes = await store.sendCommand(["FT._LIST"]);
    if (indexes.includes("idx:products")) return true;
    await store.sendCommand([
      "FT.CREATE",
      "idx:products",
      "ON",
      "JSON",
      "PREFIX",
      "1",
      "product:",
      "SCHEMA",
      "$.name",
      "AS",
      "name",
      "TEXT",
      "WEIGHT",
      "5.0",
      "$.description",
      "AS",
      "description",
      "TEXT",
      "$.brand",
      "AS",
      "brand",
      "TAG",
      "SORTABLE",
      "$.categoryId",
      "AS",
      "categoryId",
      "TAG",
      "$.tags[*]",
      "AS",
      "tags",
      "TAG",
      "$.price",
      "AS",
      "price",
      "NUMERIC",
      "SORTABLE",
      "$.rating",
      "AS",
      "rating",
      "NUMERIC",
      "SORTABLE"
    ]);
    return true;
  } catch (error) {
    console.warn(`Search index unavailable: ${error.message}`);
    return false;
  }
}

module.exports = { seedDatabase, ensureSearchIndex };

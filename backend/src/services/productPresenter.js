async function availableStock(store, product) {
  if (!product) return 0;
  const inventory = await store.hGetAll(`inventory:${product.id}`);
  const quantity = Number(inventory.quantity ?? product.inventory?.quantity ?? 0);
  const reserved = Number(inventory.reserved ?? product.inventory?.reserved ?? 0);
  return Math.max(0, quantity - reserved);
}

async function enrichProduct(store, product) {
  if (!product) return product;
  return {
    ...product,
    availableStock: await availableStock(store, product)
  };
}

async function enrichProducts(store, products) {
  return Promise.all(products.map((product) => enrichProduct(store, product)));
}

module.exports = { availableStock, enrichProduct, enrichProducts };

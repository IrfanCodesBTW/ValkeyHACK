const DocumentRepository = require("./documentRepository");

function createRepositories(store) {
  return {
    users: new DocumentRepository(store, "user", "users:all"),
    products: new DocumentRepository(store, "product", "products:all"),
    categories: new DocumentRepository(store, "category", "categories:all"),
    coupons: new DocumentRepository(store, "coupon", "coupons:all"),
    orders: new DocumentRepository(store, "order", "orders:all")
  };
}

module.exports = { createRepositories };

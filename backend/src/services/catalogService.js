const { notFound } = require("../lib/errors");
const { enrichProduct, enrichProducts } = require("./productPresenter");

function sortProducts(items, sort = "newest") {
  const copy = [...items];
  const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  const sorters = {
    newest: byDate,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rating_desc: (a, b) => b.rating - a.rating,
    name_asc: (a, b) => a.name.localeCompare(b.name)
  };
  return copy.sort(sorters[sort] || byDate);
}

class CatalogService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  async list(query = {}) {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 12, 1), 100);
    let products = (await this.repos.products.all()).filter((item) => item.status === "active");

    if (query.categoryId) products = products.filter((item) => item.categoryId === query.categoryId);
    if (query.brand) products = products.filter((item) => item.brand.toLowerCase() === query.brand.toLowerCase());
    if (query.minPrice !== undefined) products = products.filter((item) => item.price >= query.minPrice);
    if (query.maxPrice !== undefined) products = products.filter((item) => item.price <= query.maxPrice);
    if (query.minRating !== undefined) products = products.filter((item) => item.rating >= query.minRating);

    products = sortProducts(products, query.sort);
    const total = products.length;
    const start = (page - 1) * pageSize;
    return { total, page, pageSize, results: await enrichProducts(this.store, products.slice(start, start + pageSize)) };
  }

  async get(id) {
    const product = await this.repos.products.get(id);
    if (!product) throw notFound("Product");
    return enrichProduct(this.store, product);
  }

  async categories() {
    const categories = await this.repos.categories.all();
    const byId = new Map(categories.map((category) => [category.id, { ...category, children: [] }]));
    const roots = [];
    for (const category of byId.values()) {
      if (category.parentId && byId.has(category.parentId)) {
        byId.get(category.parentId).children.push(category);
      } else {
        roots.push(category);
      }
    }
    return roots;
  }
}

module.exports = { CatalogService, sortProducts };

const { sortProducts } = require("./catalogService");

function includes(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

class SearchService {
  constructor(repos) {
    this.repos = repos;
  }

  async search(query = {}) {
    const q = (query.q || "").trim();
    let products = (await this.repos.products.all()).filter((item) => item.status === "active");
    if (q) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      products = products.filter((product) => {
        const text = [product.name, product.description, product.brand, product.categoryId, ...(product.tags || [])]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => text.includes(term));
      });
    }
    if (query.categoryId) products = products.filter((item) => item.categoryId === query.categoryId);
    if (query.minPrice !== undefined) products = products.filter((item) => item.price >= query.minPrice);
    if (query.maxPrice !== undefined) products = products.filter((item) => item.price <= query.maxPrice);
    if (query.minRating !== undefined) products = products.filter((item) => item.rating >= query.minRating);
    if (query.brand) products = products.filter((item) => includes(item.brand, query.brand));

    const facets = this.facets(products);
    products = sortProducts(products, query.sort || (q ? "rating_desc" : "newest"));
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 12, 1), 100);
    const total = products.length;
    const results = products.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const suggestions = total === 0 ? await this.suggest(q.slice(0, 3) || "g") : [];
    return { query: q, total, page, pageSize, results, facets, suggestions, source: "fallback" };
  }

  facets(products) {
    const countBy = (getter) => {
      const map = new Map();
      products.forEach((item) => map.set(getter(item), (map.get(getter(item)) || 0) + 1));
      return Array.from(map.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    };
    return {
      categories: countBy((item) => item.categoryId),
      brands: countBy((item) => item.brand),
      priceRanges: [
        { key: "under_25000", count: products.filter((item) => item.price < 25000).length },
        { key: "25000_60000", count: products.filter((item) => item.price >= 25000 && item.price <= 60000).length },
        { key: "above_60000", count: products.filter((item) => item.price > 60000).length }
      ]
    };
  }

  async suggest(prefix = "") {
    const normalized = prefix.toLowerCase();
    if (!normalized) return [];
    const products = await this.repos.products.all();
    return products
      .flatMap((product) => [product.name, product.brand, ...(product.tags || [])])
      .filter((value, index, list) => value && list.indexOf(value) === index)
      .filter((value) => value.toLowerCase().includes(normalized))
      .slice(0, 10);
  }
}

module.exports = { SearchService };

const weights = { view: 1, cart: 3, purchase: 8 };
const { enrichProduct } = require("./productPresenter");

class TrendingService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  buckets(now = Date.now()) {
    return {
      hour: Math.floor(now / 3600000),
      day: Math.floor(now / 86400000)
    };
  }

  async track(type, productId, quantity = 1) {
    const product = await this.repos.products.get(productId);
    if (!product) return;
    const weight = (weights[type] || 1) * quantity;
    const { hour, day } = this.buckets();
    const keys = [
      `trending:global:1h:${hour}`,
      `trending:global:24h:${day}`,
      `trending:category:${product.categoryId}:1h:${hour}`,
      `trending:category:${product.categoryId}:24h:${day}`
    ];
    for (const key of keys) {
      await this.store.zIncrBy(key, weight, productId);
      await this.store.expire(key, key.includes("1h") ? 7200 : 172800);
    }
  }

  async top({ window = "24h", limit = 8, categoryId } = {}) {
    const { hour, day } = this.buckets();
    const bucket = window === "1h" ? hour : day;
    const key = categoryId
      ? `trending:category:${categoryId}:${window}:${bucket}`
      : `trending:global:${window}:${bucket}`;
    const rows = await this.store.zRevRangeWithScores(key, 0, Math.min(Number(limit) || 8, 50) - 1);
    const products = [];
    for (const row of rows) {
      const product = await this.repos.products.get(row.value);
      if (product) products.push({ ...(await enrichProduct(this.store, product)), trendingScore: row.score });
    }
    return { window, results: products };
  }
}

module.exports = { TrendingService, weights };

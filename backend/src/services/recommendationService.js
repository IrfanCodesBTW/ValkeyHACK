const { enrichProduct } = require("./productPresenter");

class RecommendationService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  key(actorId, suffix) {
    return `${actorId}:${suffix}`;
  }

  async track(actorId, type, productId, quantity = 1) {
    const product = await this.repos.products.get(productId);
    if (!product) return;
    const map = { view: "viewed_products", cart: "cart_adds", purchase: "purchases" };
    const suffix = map[type] || "viewed_products";
    await this.store.zIncrBy(this.key(actorId, suffix), quantity, productId);
    await this.store.zIncrBy(this.key(actorId, "viewed_categories"), quantity, product.categoryId);
    await this.store.expire(this.key(actorId, suffix), 2592000);
    await this.store.expire(this.key(actorId, "viewed_categories"), 2592000);
  }

  async recommend(actorId, limit = 8) {
    const topCategories = await this.store.zRevRangeWithScores(this.key(actorId, "viewed_categories"), 0, 4);
    const purchased = new Set((await this.store.zRevRangeWithScores(this.key(actorId, "purchases"), 0, 99)).map((row) => row.value));
    const products = (await this.repos.products.all()).filter((item) => !purchased.has(item.id));
    const categories = topCategories.map((row) => row.value);
    const scored = products.map((product) => ({
      product,
      score: (categories.includes(product.categoryId) ? 20 : 0) + product.rating * 2 + Math.max(0, 100000 - product.price) / 100000
    }));
    const sorted = scored.sort((a, b) => b.score - a.score).slice(0, Math.min(Number(limit) || 8, 24));
    const enriched = await Promise.all(
      sorted.map(async ({ product, score }) => ({
        ...(await enrichProduct(this.store, product)),
        recommendationScore: Number(score.toFixed(2)),
        rationale: categories.includes(product.categoryId)
          ? "Matches your recent category interest."
          : "Popular highly rated product from the demo catalog."
      }))
    );
    return {
      source: "deterministic",
      results: enriched
    };
  }
}

module.exports = { RecommendationService };

const { badRequest, conflict, notFound } = require("../lib/errors");
const { createId } = require("../lib/ids");
const fs = require("fs");
const path = require("path");

const reserveInventoryScript = fs.readFileSync(path.join(__dirname, "../scripts/reserveInventory.lua"), "utf8");

class CheckoutService {
  constructor(store, repos, cartService, trendingService, recommendationService) {
    this.store = store;
    this.repos = repos;
    this.cartService = cartService;
    this.trendingService = trendingService;
    this.recommendationService = recommendationService;
  }

  async checkout(userId, idempotencyKey, shippingAddress = {}) {
    if (!idempotencyKey) throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required");
    const idempotencyStoreKey = `idempotency:${userId}:${idempotencyKey}`;
    const existing = await this.store.get(idempotencyStoreKey);
    if (existing) return { order: JSON.parse(existing), duplicate: true };

    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw badRequest("EMPTY_CART", "Cart is empty");

    await this.reserveInventory(cart.items);

    const order = {
      id: createId("order"),
      userId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      })),
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      coupon: cart.coupon,
      shippingAddress,
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    await this.repos.orders.save(order.id, order);
    await this.store.zAdd(`orders:user:${userId}`, { score: Date.now(), value: order.id });
    await this.store.setEx(idempotencyStoreKey, 86400, JSON.stringify(order));
    for (const item of cart.items) {
      await this.trendingService.track("purchase", item.productId, item.quantity);
      await this.recommendationService.track(userId, "purchase", item.productId, item.quantity);
    }
    await this.cartService.clear(userId);
    return { order, duplicate: false };
  }

  async listOrders(userId) {
    const rows = await this.store.zRevRangeWithScores(`orders:user:${userId}`, 0, 50);
    return (await Promise.all(rows.map((row) => this.repos.orders.get(row.value)))).filter(Boolean);
  }

  async reserveInventory(items) {
    if (this.store.kind === "valkey") {
      const keys = items.map((item) => `inventory:${item.productId}`);
      const args = items.map((item) => String(item.quantity));
      const result = await this.store.eval(reserveInventoryScript, { keys, arguments: args });
      if (Array.isArray(result) && Number(result[0]) === 1) return;
      const index = Number(result[1]) - 1;
      throw conflict("INSUFFICIENT_STOCK", "Some items do not have enough stock", [
        { productId: items[index]?.productId, available: Number(result[2] || 0) }
      ]);
    }

    const insufficient = [];
    for (const item of items) {
      const available = await this.cartService.available(item.productId);
      if (item.quantity > available) insufficient.push({ productId: item.productId, available });
    }
    if (insufficient.length) throw conflict("INSUFFICIENT_STOCK", "Some items do not have enough stock", insufficient);

    for (const item of items) {
      const inventory = await this.store.hGetAll(`inventory:${item.productId}`);
      await this.store.hSet(`inventory:${item.productId}`, {
        quantity: String(Number(inventory.quantity || 0) - item.quantity),
        reserved: String(Number(inventory.reserved || 0))
      });
    }
  }

  async getOrder(userId, orderId) {
    const order = await this.repos.orders.get(orderId);
    if (!order || order.userId !== userId) throw notFound("Order");
    return order;
  }
}

module.exports = { CheckoutService };

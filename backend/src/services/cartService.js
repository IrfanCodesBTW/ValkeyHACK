const { badRequest, notFound } = require("../lib/errors");

class CartService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  key(userId) {
    return `cart:${userId}`;
  }

  async available(productId) {
    const inventory = await this.store.hGetAll(`inventory:${productId}`);
    const quantity = Number(inventory.quantity || 0);
    const reserved = Number(inventory.reserved || 0);
    return Math.max(0, quantity - reserved);
  }

  async ensureProduct(productId) {
    const product = await this.repos.products.get(productId);
    if (!product) throw notFound("Product");
    return product;
  }

  async addItem(userId, productId, quantity) {
    await this.ensureProduct(productId);
    const available = await this.available(productId);
    if (quantity > available) throw badRequest("INSUFFICIENT_STOCK", "Requested quantity exceeds available stock", { available });
    await this.store.hSet(this.key(userId), productId, String(quantity));
    return this.getCart(userId);
  }

  async updateItem(userId, productId, quantity) {
    return this.addItem(userId, productId, quantity);
  }

  async removeItem(userId, productId) {
    await this.store.hDel(this.key(userId), productId);
    return this.getCart(userId);
  }

  async clear(userId) {
    await this.store.del([this.key(userId), `cart_coupon:${userId}`]);
  }

  async applyCoupon(userId, code) {
    const cart = await this.getCart(userId);
    const coupon = await this.repos.coupons.get(`coupon:${code}`);
    if (!coupon) throw badRequest("COUPON_NOT_FOUND", "Coupon does not exist");
    this.validateCoupon(coupon, cart.subtotal);
    await this.store.set(`cart_coupon:${userId}`, code);
    return this.getCart(userId);
  }

  async removeCoupon(userId) {
    await this.store.del(`cart_coupon:${userId}`);
    return this.getCart(userId);
  }

  validateCoupon(coupon, subtotal) {
    const now = Date.now();
    if (!coupon.active) throw badRequest("COUPON_INACTIVE", "Coupon is inactive");
    if (now < new Date(coupon.validFrom).getTime()) throw badRequest("COUPON_NOT_STARTED", "Coupon is not active yet");
    if (now > new Date(coupon.validUntil).getTime()) throw badRequest("COUPON_EXPIRED", "Coupon has expired");
    if (coupon.usedCount >= coupon.usageLimit) throw badRequest("COUPON_USAGE_LIMIT", "Coupon usage limit reached");
    if (subtotal < coupon.minOrderAmount) {
      throw badRequest("COUPON_MIN_ORDER", `Minimum order amount is INR ${coupon.minOrderAmount}`, {
        minOrderAmount: coupon.minOrderAmount
      });
    }
  }

  discountFor(coupon, subtotal) {
    if (!coupon) return 0;
    if (coupon.type === "fixed") return Math.min(coupon.value, subtotal);
    return Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount || subtotal);
  }

  async getCart(userId) {
    const raw = await this.store.hGetAll(this.key(userId));
    const items = [];
    for (const [productId, quantityText] of Object.entries(raw)) {
      const product = await this.repos.products.get(productId);
      if (!product) continue;
      const quantity = Number(quantityText);
      items.push({
        product,
        productId,
        quantity,
        unitPrice: product.price,
        subtotal: product.price * quantity
      });
    }
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const couponCode = await this.store.get(`cart_coupon:${userId}`);
    const coupon = couponCode ? await this.repos.coupons.get(`coupon:${couponCode}`) : null;
    let discount = 0;
    let appliedCoupon = null;
    if (coupon) {
      try {
        this.validateCoupon(coupon, subtotal);
        discount = this.discountFor(coupon, subtotal);
        appliedCoupon = { code: coupon.code, type: coupon.type, value: coupon.value, discount };
      } catch (error) {
        await this.store.del(`cart_coupon:${userId}`);
      }
    }
    return {
      items,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      coupon: appliedCoupon
    };
  }
}

module.exports = { CartService };

const express = require("express");
const config = require("../config");
const validate = require("../middleware/validate");
const { attachAuth, requireAuth, actorId } = require("../middleware/auth");
const { fixedWindowRateLimit, slidingWindowRateLimit, tokenBucketRateLimit } = require("../middleware/rateLimiter");
const schemas = require("../validators/schemas");

function routes(context) {
  const router = express.Router();
  const { services, store } = context;

  const authLoginLimiter = fixedWindowRateLimit({
    store,
    limit: config.rateLimits.authLogin.limit,
    windowSeconds: config.rateLimits.authLogin.windowSeconds,
    keyResolver: (req) => `auth:${req.ip}:${req.body?.email || "unknown"}`
  });
  const searchLimiter = slidingWindowRateLimit({
    store,
    limit: config.rateLimits.search.limit,
    windowSeconds: config.rateLimits.search.windowSeconds,
    keyResolver: (req) => `search:${req.ip}`
  });
  const checkoutLimiter = tokenBucketRateLimit({
    store,
    limit: config.rateLimits.checkout.limit,
    windowSeconds: config.rateLimits.checkout.windowSeconds,
    keyResolver: (req) => `checkout:${req.user?.id || req.ip}`
  });
  const recommendationsLimiter = slidingWindowRateLimit({
    store,
    limit: config.rateLimits.recommendations.limit,
    windowSeconds: config.rateLimits.recommendations.windowSeconds,
    keyResolver: (req) => `recommendations:${req.user?.id || req.ip}`
  });

  router.get("/health", async (req, res) => {
    const health = await context.store.health();
    res.json({
      status: "ok",
      valkey: health.connected ? "connected" : "disconnected",
      search: health.search ? "available" : "unavailable",
      json: health.json ? "available" : "unavailable",
      memoryStore: health.memory
    });
  });

  router.use(attachAuth(context));

  router.post("/auth/register", validate(schemas.registerBody), async (req, res, next) => {
    try {
      const user = await services.auth.register(req.body);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/login", validate(schemas.loginBody), authLoginLimiter, async (req, res, next) => {
    try {
      const { user, token } = await services.auth.login(req.body, req.ip);
      res.cookie(config.session.cookieName, token, {
        httpOnly: true,
        secure: config.session.secureCookie,
        sameSite: "lax",
        maxAge: config.session.ttlSeconds * 1000
      });
      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/logout", requireAuth, async (req, res, next) => {
    try {
      await services.auth.logout(req.sessionToken);
      res.clearCookie(config.session.cookieName);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post("/auth/refresh", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.get("/products", validate(schemas.productQuery, "query"), async (req, res, next) => {
    try {
      res.json(await services.catalog.list(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/products/:id", async (req, res, next) => {
    try {
      res.json(await services.catalog.get(req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories", async (req, res, next) => {
    try {
      res.json({ results: await services.catalog.categories() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/cart", requireAuth, async (req, res, next) => {
    try {
      res.json(await services.cart.getCart(req.user.id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/items", requireAuth, validate(schemas.cartItemBody), async (req, res, next) => {
    try {
      const cart = await services.cart.addItem(req.user.id, req.body.productId, req.body.quantity);
      await services.trending.track("cart", req.body.productId, req.body.quantity);
      await services.recommendations.track(req.user.id, "cart", req.body.productId, req.body.quantity);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/cart/items/:productId", requireAuth, validate(schemas.cartPatchBody), async (req, res, next) => {
    try {
      res.json(await services.cart.updateItem(req.user.id, req.params.productId, req.body.quantity));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/cart/items/:productId", requireAuth, async (req, res, next) => {
    try {
      res.json(await services.cart.removeItem(req.user.id, req.params.productId));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/cart", requireAuth, async (req, res, next) => {
    try {
      await services.cart.clear(req.user.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post("/cart/coupon", requireAuth, validate(schemas.couponBody), async (req, res, next) => {
    try {
      res.json(await services.cart.applyCoupon(req.user.id, req.body.code));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/cart/coupon", requireAuth, async (req, res, next) => {
    try {
      res.json(await services.cart.removeCoupon(req.user.id));
    } catch (error) {
      next(error);
    }
  });

  router.post("/events/view", validate(schemas.productEventBody), async (req, res, next) => {
    try {
      const actor = actorId(req);
      res.cookie("valkey_anon", actor, { sameSite: "lax", maxAge: 2592000000 });
      await services.trending.track("view", req.body.productId, req.body.quantity);
      await services.recommendations.track(req.user?.id || actor, "view", req.body.productId, req.body.quantity);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/events/add-to-cart", validate(schemas.productEventBody), async (req, res, next) => {
    try {
      await services.trending.track("cart", req.body.productId, req.body.quantity);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/events/purchase", validate(schemas.productEventBody), async (req, res, next) => {
    try {
      await services.trending.track("purchase", req.body.productId, req.body.quantity);
      res.status(202).json({ accepted: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/trending", async (req, res, next) => {
    try {
      res.json(await services.trending.top(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/search", validate(schemas.searchQuery, "query"), searchLimiter, async (req, res, next) => {
    try {
      res.json(await services.search.search(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/search/suggest", searchLimiter, async (req, res, next) => {
    try {
      res.json({ query: req.query.q || "", suggestions: await services.search.suggest(req.query.q || "") });
    } catch (error) {
      next(error);
    }
  });

  router.get("/search/facets", searchLimiter, async (req, res, next) => {
    try {
      const response = await services.search.search(req.query);
      res.json({ facets: response.facets });
    } catch (error) {
      next(error);
    }
  });

  router.post("/checkout", requireAuth, checkoutLimiter, validate(schemas.checkoutBody), async (req, res, next) => {
    try {
      const { order, duplicate } = await services.checkout.checkout(
        req.user.id,
        req.header("Idempotency-Key"),
        req.body.shippingAddress
      );
      res.status(duplicate ? 200 : 201).json(order);
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders", requireAuth, async (req, res, next) => {
    try {
      res.json({ results: await services.checkout.listOrders(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:id", requireAuth, async (req, res, next) => {
    try {
      res.json(await services.checkout.getOrder(req.user.id, req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/recommendations", recommendationsLimiter, async (req, res, next) => {
    try {
      const actor = req.user?.id || actorId(req);
      res.cookie("valkey_anon", actor, { sameSite: "lax", maxAge: 2592000000 });
      res.json(await services.recommendations.recommend(actor, req.query.limit));
    } catch (error) {
      next(error);
    }
  });

  router.post("/agentic-search", validate(schemas.agenticBody), searchLimiter, async (req, res, next) => {
    try {
      res.json(await services.agenticSearch.search(req.body.query));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = routes;

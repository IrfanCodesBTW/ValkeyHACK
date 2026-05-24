const request = require("supertest");
const createApp = require("../src/app");
const { createRuntimeContext } = require("../src/runtime");
const { seedDatabase } = require("../src/seed/seedDatabase");

describe("Valkey e-commerce API", () => {
  let context;
  let app;
  let agent;

  beforeAll(async () => {
    context = await createRuntimeContext();
    await seedDatabase(context.store);
    app = createApp(context);
    agent = request.agent(app);
  });

  afterAll(async () => {
    await context.store.quit();
  });

  test("auth protects account routes and supports register/login/logout", async () => {
    await request(app).get("/api/auth/me").expect(401);

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "new.user@example.com",
        password: "ValkeyPass123",
        firstName: "New",
        lastName: "User"
      })
      .expect(201);

    await request(app)
      .post("/api/auth/register")
      .send({
        email: "new.user@example.com",
        password: "ValkeyPass123",
        firstName: "New",
        lastName: "User"
      })
      .expect(409);

    await agent.post("/api/auth/login").send({ email: "new.user@example.com", password: "wrong" }).expect(401);
    await agent.post("/api/auth/login").send({ email: "new.user@example.com", password: "ValkeyPass123" }).expect(200);
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.email).toBe("new.user@example.com");
    await agent.post("/api/auth/logout").expect(204);
    await agent.get("/api/auth/me").expect(401);
  });

  test("catalog lists products, filters, paginates, and handles invalid details", async () => {
    const list = await request(app).get("/api/products?page=1&pageSize=5&sort=price_asc").expect(200);
    expect(list.body.results).toHaveLength(5);
    expect(list.body.total).toBeGreaterThan(20);
    expect(list.body.results[0].price).toBeLessThanOrEqual(list.body.results[1].price);
    expect(list.body.results[0].availableStock).toBeGreaterThanOrEqual(0);

    const filtered = await request(app).get("/api/products?categoryId=category:laptops").expect(200);
    expect(filtered.body.results.every((item) => item.categoryId === "category:laptops")).toBe(true);

    const detail = await request(app).get("/api/products/product:001").expect(200);
    expect(detail.body.availableStock).toBeGreaterThan(0);
    await request(app).get("/api/products/product:missing").expect(404);
  });

  test("cart and coupons cover valid and invalid flows", async () => {
    await agent.post("/api/auth/login").send({ email: "demo@valkey.local", password: "ValkeyDemo123" }).expect(200);
    await agent.delete("/api/cart").expect(204);

    await agent.post("/api/cart/items").send({ productId: "product:012", quantity: 1 }).expect(200);
    const incremented = await agent.post("/api/cart/items").send({ productId: "product:012", quantity: 2 }).expect(200);
    expect(incremented.body.items.find((item) => item.productId === "product:012").quantity).toBe(3);
    expect(incremented.body.items[0].product.availableStock).toBeGreaterThanOrEqual(0);
    expect(await context.store.ttl("cart:user:demo")).toBeGreaterThan(0);
    const minFail = await agent.post("/api/cart/coupon").send({ code: "VALKEY10" }).expect(400);
    expect(minFail.body.error.code).toBe("COUPON_MIN_ORDER");

    await agent.post("/api/cart/items").send({ productId: "product:004", quantity: 1 }).expect(200);
    const coupon = await agent.post("/api/cart/coupon").send({ code: "VALKEY10" }).expect(200);
    expect(coupon.body.discount).toBeGreaterThan(0);
    expect(await context.store.ttl("cart_coupon:user:demo")).toBeGreaterThan(0);

    await agent.post("/api/cart/coupon").send({ code: "EXPIRED20" }).expect(400);
    await agent.patch("/api/cart/items/product:001").send({ quantity: 2 }).expect(200);
    await agent.delete("/api/cart/items/product:001").expect(200);
  });

  test("trending ranks weighted events", async () => {
    await request(app).post("/api/events/view").send({ productId: "product:001" }).expect(202);
    await request(app).post("/api/events/add-to-cart").send({ productId: "product:002" }).expect(202);
    await request(app).post("/api/events/purchase").send({ productId: "product:003", quantity: 2 }).expect(202);
    const trending = await request(app).get("/api/trending?window=24h&limit=3").expect(200);
    expect(trending.body.results[0].id).toBe("product:003");
  });

  test("search, suggestions, recommendations, and agentic search return useful results", async () => {
    const search = await request(app).get("/api/search?q=gaming%20laptop&maxPrice=60000&minRating=4").expect(200);
    expect(search.body.results.some((item) => item.id === "product:001")).toBe(true);
    expect(search.body.source).toBe("fallback");
    expect(search.body.results[0].availableStock).toBeGreaterThanOrEqual(0);

    const suggestions = await request(app).get("/api/search/suggest?q=lap").expect(200);
    expect(suggestions.body.suggestions.length).toBeGreaterThan(0);

    const agentic = await request(app)
      .post("/api/agentic-search")
      .send({ query: "budget gaming laptops under 60000 with good ratings" })
      .expect(200);
    expect(agentic.body.filters.maxPrice).toBe(60000);
    expect(agentic.body.results.some((item) => item.id === "product:001")).toBe(true);

    const phoneCamera = await request(app)
      .post("/api/agentic-search")
      .send({ query: "phones with good camera under 30000" })
      .expect(200);
    expect(phoneCamera.body.filters.categoryId).toBe("category:phones");
    expect(phoneCamera.body.filters.maxPrice).toBe(30000);
    expect(phoneCamera.body.results.some((item) => item.id === "product:010")).toBe(true);

    const headphones = await request(app)
      .post("/api/agentic-search")
      .send({ query: "best headphones with high rating" })
      .expect(200);
    expect(headphones.body.filters.categoryId).toBe("category:audio");
    expect(headphones.body.filters.minRating).toBe(4);
    expect(headphones.body.results.some((item) => item.id === "product:011")).toBe(true);

    const recs = await agent.get("/api/recommendations?limit=4").expect(200);
    expect(recs.body.results).toHaveLength(4);
  });

  test("checkout handles success, idempotency, empty cart, and insufficient stock", async () => {
    await agent.delete("/api/cart").expect(204);
    const before = await request(app).get("/api/products/product:001").expect(200);
    await agent.post("/api/cart/items").send({ productId: "product:001", quantity: 1 }).expect(200);
    await agent.post("/api/cart/coupon").send({ code: "VALKEY10" }).expect(200);
    const couponBefore = await context.services.repos.coupons.get("coupon:VALKEY10");
    const checkout = await agent
      .post("/api/checkout")
      .set("Idempotency-Key", "test-key-1")
      .send({ shippingAddress: { name: "Demo", phone: "9999999999", street: "MG Road", city: "Hyderabad", postalCode: "500001" } })
      .expect(201);
    expect(checkout.body.id).toMatch(/^order:/);
    const after = await request(app).get("/api/products/product:001").expect(200);
    expect(after.body.availableStock).toBe(before.body.availableStock - 1);
    const couponAfter = await context.services.repos.coupons.get("coupon:VALKEY10");
    expect(couponAfter.usedCount).toBe(couponBefore.usedCount + 1);

    const duplicate = await agent.post("/api/checkout").set("Idempotency-Key", "test-key-1").send({}).expect(200);
    expect(duplicate.body.id).toBe(checkout.body.id);

    await agent.post("/api/checkout").set("Idempotency-Key", "empty-cart").send({}).expect(400);
    await agent.post("/api/cart/items").send({ productId: "product:001", quantity: 99 }).expect(400);
  });
});

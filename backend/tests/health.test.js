const request = require("supertest");
const createApp = require("../src/app");
const { createRuntimeContext } = require("../src/runtime");

describe("health", () => {
  let context;

  beforeAll(async () => {
    context = await createRuntimeContext();
  });

  afterAll(async () => {
    await context.store.quit();
  });

  test("returns API and Valkey capability status", async () => {
    const app = createApp(context);
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.valkey).toBe("connected");
    expect(response.body.search).toBe("unavailable");
    expect(response.body.searchModule).toBe("unavailable");
    expect(response.body.json).toBe("unavailable");
    expect(response.body.memoryStore).toBe(true);
  });
});

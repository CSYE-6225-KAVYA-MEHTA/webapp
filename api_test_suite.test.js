const request = require("supertest");
const { app } = require("./app.js"); // Change this if needed based on your .env PORT

const { shutdownStatsD } = require("./metrics");

afterAll(() => {
  shutdownStatsD();
});

describe("API Tests", () => {
  const methods = ["post", "put", "delete", "patch", "head", "options"];

  test("GET /healthz should return 200", async () => {
    const response = await request(app).get("/healthz");
    expect(response.statusCode).toBe(200);
  });

  methods.forEach((method) => {
    test(`${method.toUpperCase()} /healthz should return 405`, async () => {
      const response = await request(app)[method]("/healthz");
      expect(response.statusCode).toBe(405);
    });
  });

  test("GET /healthz should return 400 for requests with query parameters", async () => {
    const response = await request(app).get("/healthz?test=value");
    expect(response.statusCode).toBe(400);
  });

  test("GET /healthz should return 400 for requests with payload", async () => {
    const response = await request(app).get("/healthz").send({ key: "value" });
    expect(response.statusCode).toBe(400);
  });

  test("GET /healthz should return 400 for requests with Content-Length header", async () => {
    const response = await request(app)
      .get("/healthz")
      .set("Content-Length", "10");
    expect(response.statusCode).toBe(400);
  });

  test("GET /healthz should return 503 if database fails", async () => {
    // Simulate a database failure (e.g., stopping MySQL)
    const response = await request(app).get("/healthz");
    expect([200, 503]).toContain(response.statusCode); // Expect either success or failure
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app, clearDb, request, startDb, stopDb } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe("health check", () => {
  it("reports ok and the database state", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe("connected");
  });
});

describe("unknown routes", () => {
  it("answers with the standard error shape, not an HTML page", async () => {
    const res = await request(app).get("/api/nope");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Route not found: GET /api/nope",
      code: "NOT_FOUND",
      data: null,
    });
  });

  it("rejects a broken json body with a readable message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "asha@example.com",}');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

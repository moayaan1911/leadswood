import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app, clearDb, createUser, request, startDb, stopDb } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const lead = { name: "Asha Rao", email: "asha.rao@northwind.example", phone: "9820041122", company: "Northwind", source: "Referral", status: "Qualified" };

const create = (token, body = lead) =>
  request(app).post("/api/leads").set("Authorization", `Bearer ${token}`).send(body);

describe("creating a lead", () => {
  it("creates the lead for the signed-in user", async () => {
    const { user, token } = await createUser();
    const res = await create(token);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Lead created");
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.owner).toBe(String(user.id));
  });

  it("refuses without a token", async () => {
    const res = await request(app).post("/api/leads").send(lead);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid input", async () => {
    const { token } = await createUser();
    const res = await create(token, { name: "", email: "nope", status: "Unknown" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "name", message: "Name is required" },
      { field: "email", message: "Enter a valid email address" },
      { field: "status", message: "Unknown status" },
    ]);
  });

  it("rejects the same email twice for one user", async () => {
    const { token } = await createUser();
    await create(token);
    const res = await create(token, { ...lead, name: "Duplicate" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });
});

describe("listing leads", () => {
  async function seed() {
    const { token } = await createUser();
    await create(token, { name: "Asha Rao", email: "a@example.com", status: "Qualified" });
    await create(token, { name: "Vikram Menon", email: "v@example.com", status: "New" });
    await create(token, { name: "Neha Kulkarni", email: "n@example.com", status: "New" });
    return token;
  }

  const list = (token, query = "") =>
    request(app).get(`/api/leads${query}`).set("Authorization", `Bearer ${token}`);

  it("returns the leads with pagination meta", async () => {
    const token = await seed();
    const res = await list(token);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it("searches by name, case insensitive", async () => {
    const token = await seed();
    const res = await list(token, "?search=VIKRAM");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Vikram Menon");
  });

  it("filters by status", async () => {
    const token = await seed();
    const res = await list(token, "?status=New");

    expect(res.body.data).toHaveLength(2);
  });

  it("sorts by a chosen field", async () => {
    const token = await seed();
    const res = await list(token, "?sort=name&order=asc");

    expect(res.body.data.map((item) => item.name)).toEqual(["Asha Rao", "Neha Kulkarni", "Vikram Menon"]);
  });

  it("pages through the results", async () => {
    const token = await seed();
    const res = await list(token, "?limit=2&page=2");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, totalPages: 2, hasPrevPage: true, hasNextPage: false });
  });

  it("only ever returns the signed-in user's leads", async () => {
    await seed();
    const { token: other } = await createUser({ email: "other@example.com" });
    const res = await list(other);

    expect(res.body.meta.total).toBe(0);
  });
});

describe("one lead", () => {
  it("returns a lead of the signed-in user", async () => {
    const { token } = await createUser();
    const created = await create(token);
    const res = await request(app)
      .get(`/api/leads/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(lead.email);
  });

  it("hides leads that belong to somebody else behind a 404", async () => {
    const { token } = await createUser();
    const created = await create(token);
    const { token: other } = await createUser({ email: "other@example.com" });

    const res = await request(app)
      .get(`/api/leads/${created.body.data.id}`)
      .set("Authorization", `Bearer ${other}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("updates the status and ignores an owner sent from outside", async () => {
    const { token } = await createUser();
    const created = await create(token);
    const { user: other } = await createUser({ email: "other@example.com" });

    const res = await request(app)
      .patch(`/api/leads/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Contacted", owner: other.id });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Contacted");
    expect(res.body.data.owner).toBe(String(created.body.data.owner));
  });

  it("deletes a lead and then cannot find it", async () => {
    const { token } = await createUser();
    const created = await create(token);

    const res = await request(app)
      .delete(`/api/leads/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Lead deleted");

    const again = await request(app)
      .get(`/api/leads/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(again.status).toBe(404);
  });
});

describe("lead counts", () => {
  it("counts the signed-in user's leads per status", async () => {
    const { token } = await createUser();
    await create(token, { name: "One", email: "one@example.com", status: "Qualified" });
    await create(token, { name: "Two", email: "two@example.com", status: "New" });
    await create(token, { name: "Three", email: "three@example.com", status: "New" });

    const res = await request(app).get("/api/leads/stats").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 3,
      byStatus: { New: 2, Contacted: 0, Qualified: 1, Lost: 0 },
    });
  });
});

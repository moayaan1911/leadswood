import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app, clearDb, request, startDb, stopDb } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

const signup = (body) => request(app).post("/api/auth/signup").send(body);
const login = (body) => request(app).post("/api/auth/login").send(body);
const account = { name: "Asha Rao", email: "asha@example.com", password: "password123" };

describe("signup", () => {
  it("creates an account and returns a token", async () => {
    const res = await signup(account);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Account created");
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe("asha@example.com");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("rejects invalid input with one error per field", async () => {
    const res = await signup({ name: "", email: "nope", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.errors).toEqual([
      { field: "name", message: "Name is required" },
      { field: "email", message: "Enter a valid email address" },
      { field: "password", message: "Use at least 8 characters" },
    ]);
  });

  it("rejects an email that is already registered", async () => {
    await signup(account);
    const res = await signup({ ...account, name: "Someone Else" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });
});

describe("login", () => {
  it("signs an existing user in", async () => {
    await signup(account);
    const res = await login({ email: account.email, password: account.password });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Signed in");
    expect(res.body.data.token).toBeTruthy();
  });

  it("does not reveal whether the email or the password was wrong", async () => {
    await signup(account);
    const res = await login({ email: account.email, password: "wrongpassword1" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid email or password",
      code: "UNAUTHORIZED",
      data: null,
    });
  });
});

describe("current user", () => {
  it("refuses without a token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns the signed-in user", async () => {
    const { body } = await signup(account);
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("asha@example.com");
  });

  it("updates the name and the password in one call", async () => {
    const { body } = await signup(account);
    const token = body.data.token;

    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Asha R. Rao", currentPassword: "password123", newPassword: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("Asha R. Rao");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const oldPassword = await login({ email: account.email, password: "password123" });
    expect(oldPassword.status).toBe(401);

    const newPassword = await login({ email: account.email, password: "newpassword123" });
    expect(newPassword.status).toBe(200);
  });

  it("rejects a wrong current password", async () => {
    const { body } = await signup(account);
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${body.data.token}`)
      .send({ currentPassword: "notmypassword1", newPassword: "anotherpassword1" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "currentPassword", message: "Current password is incorrect" },
    ]);
  });

  it("asks for something to update when the body is empty", async () => {
    const { body } = await signup(account);
    const res = await request(app)
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${body.data.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nothing to update");
  });
});

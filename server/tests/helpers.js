import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { env } from "../src/config/env.config.js";
import { User } from "../src/models/user.model.js";
import { Lead } from "../src/models/lead.model.js";

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDb() {
  await Promise.all([User.deleteMany({}), Lead.deleteMany({})]);
}

// a signed-in user plus a bearer token, created directly so lead tests do not
// depend on the signup endpoint
export async function createUser(overrides = {}) {
  const user = await User.create({
    name: "Asha Rao",
    email: "asha@example.com",
    passwordHash: await bcrypt.hash("password123", 4),
    ...overrides,
  });

  return { user, token: jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: "7d" }) };
}

export { app, request, User, Lead };

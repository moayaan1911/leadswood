import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { User } from "../models/user.model.js";

// verify the bearer token and attach the signed-in user
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    throw Object.assign(new Error("You must be signed in"), { status: 401, code: "UNAUTHORIZED" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    const message = error.name === "TokenExpiredError" ? "Your session has expired" : "Invalid token";
    throw Object.assign(new Error(message), { status: 401, code: "UNAUTHORIZED" });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw Object.assign(new Error("Invalid token"), { status: 401, code: "UNAUTHORIZED" });
  }

  req.user = user;
  next();
}

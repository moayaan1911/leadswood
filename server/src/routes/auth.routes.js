import { Router } from "express";
import { login, me, signup, updateUser } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rate-limit.middleware.js";

export const authRoutes = Router();

// public routes, rate limited
authRoutes.post("/signup", authLimiter, signup);
authRoutes.post("/login", authLimiter, login);

// routes that need a signed-in user
authRoutes.get("/me", requireAuth, me);
authRoutes.patch("/me", requireAuth, updateUser);

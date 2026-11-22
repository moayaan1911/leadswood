import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { connectDb } from "./config/db.config.js";
import { env } from "./config/env.config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/not-found.middleware.js";
import { apiLimiter } from "./middleware/rate-limit.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";
import { leadRoutes } from "./routes/lead.routes.js";

export const app = express();

// behind a proxy on Render/Railway, so the limiter sees the real client ip
app.set("trust proxy", 1);

// load global middlewares
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter);

// health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "OK",
    data: {
      uptime: Math.round(process.uptime()),
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);

// load custom middlewares
app.use(notFound);
app.use(errorHandler);

// tests import the app without opening a port or touching the real database
if (!env.isTest) {
  await connectDb();

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

import { Router } from "express";
import { deleteUser, getUser, listUsers, updateUser } from "../controllers/user.controller.js";

export const userRoutes = Router();

// user routes
userRoutes.get("/", listUsers);
userRoutes.get("/:id", getUser);
userRoutes.patch("/:id", updateUser);
userRoutes.delete("/:id", deleteUser);

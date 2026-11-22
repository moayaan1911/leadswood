import { Router } from "express";
import { createLead, deleteLead, getLead, leadStats, listLeads, updateLead } from "../controllers/lead.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const leadRoutes = Router();

// every lead route belongs to the signed-in user
leadRoutes.use(requireAuth);

// /stats must come before /:id, otherwise "stats" is read as an id
leadRoutes.get("/stats", leadStats);
leadRoutes.get("/", listLeads);
leadRoutes.get("/:id", getLead);
leadRoutes.post("/", createLead);
leadRoutes.patch("/:id", updateLead);
leadRoutes.delete("/:id", deleteLead);

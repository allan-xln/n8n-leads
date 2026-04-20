import { Router } from "express";
import { fetchConfig, updateConfig } from "../controllers/configController.js";
import { getHealth } from "../controllers/healthController.js";
import { fetchLatestLeadBatch, runLeadBatch } from "../controllers/runController.js";

export const router = Router();

router.get("/health", getHealth);
router.get("/api/config", fetchConfig);
router.post("/api/config", updateConfig);
router.post("/api/run", runLeadBatch);
router.get("/api/leads/latest", fetchLatestLeadBatch);

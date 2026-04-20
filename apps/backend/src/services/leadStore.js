import path from "node:path";
import { env } from "../config/env.js";
import { defaultLatestLeads } from "../data/defaultLatestLeads.js";
import { readJsonFile, writeJsonFile } from "../utils/fileStore.js";

const latestLeadsPath = path.join(env.dataDir, "latest-leads.json");

export async function getLatestLeadBatch() {
  return readJsonFile(latestLeadsPath, defaultLatestLeads);
}

export async function saveLatestLeadBatch(batch) {
  await writeJsonFile(latestLeadsPath, batch);
  return batch;
}

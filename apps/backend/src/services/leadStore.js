import path from "node:path";
import { env } from "../config/env.js";
import { defaultLatestLeads } from "../data/defaultLatestLeads.js";
import { defaultLeadHistory } from "../data/defaultLeadHistory.js";
import { readJsonFile, writeJsonFile } from "../utils/fileStore.js";
import { normalizeText } from "../utils/text.js";
import { normalizeWhatsAppPhone } from "../utils/phone.js";

const latestLeadsPath = path.join(env.dataDir, "latest-leads.json");
const leadHistoryPath = path.join(env.dataDir, "lead-history.json");

function createLeadFingerprint(lead) {
  return normalizeText([lead.companyName || "", lead.city || "", lead.segment || ""].join("|"));
}

function toHistoryEntry(lead) {
  return {
    id: lead.id || "",
    contactPhone: normalizeWhatsAppPhone(lead.contactPhone || ""),
    fingerprint: createLeadFingerprint(lead)
  };
}

export async function getLatestLeadBatch() {
  return readJsonFile(latestLeadsPath, defaultLatestLeads);
}

export async function saveLatestLeadBatch(batch) {
  await writeJsonFile(latestLeadsPath, batch);
  return batch;
}

export async function getLeadHistory() {
  const history = await readJsonFile(leadHistoryPath, defaultLeadHistory);
  const leads = Array.isArray(history?.leads) ? history.leads : [];

  return {
    updatedAt: history?.updatedAt || null,
    leads
  };
}

export async function registerLeadHistory(leads) {
  const history = await getLeadHistory();
  const nextLeads = [...history.leads];
  const knownKeys = new Set();

  for (const lead of history.leads) {
    if (lead.id) {
      knownKeys.add(`id:${lead.id}`);
    }

    if (lead.contactPhone) {
      knownKeys.add(`phone:${lead.contactPhone}`);
    }

    if (lead.fingerprint) {
      knownKeys.add(`fingerprint:${lead.fingerprint}`);
    }
  }

  for (const lead of leads) {
    const entry = toHistoryEntry(lead);
    const keys = [
      entry.id ? `id:${entry.id}` : "",
      entry.contactPhone ? `phone:${entry.contactPhone}` : "",
      entry.fingerprint ? `fingerprint:${entry.fingerprint}` : ""
    ].filter(Boolean);

    if (!keys.length || keys.some((key) => knownKeys.has(key))) {
      continue;
    }

    nextLeads.push(entry);
    keys.forEach((key) => knownKeys.add(key));
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    leads: nextLeads.slice(-5000)
  };

  await writeJsonFile(leadHistoryPath, payload);
  return payload;
}

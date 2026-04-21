import path from "node:path";
import { env } from "../config/env.js";
import { configInputSchema } from "../types/config.js";
import { normalizeConfigGeography } from "./geographicStrategyService.js";
import { readJsonFile, writeJsonFile } from "../utils/fileStore.js";

const configPath = path.join(env.dataDir, "config.json");
const defaultConfigPath = path.resolve(env.dataDir, "../configs/default-config.json");

export async function getConfig() {
  const fallback = await readJsonFile(defaultConfigPath, {
    destinationWhatsApp: "",
    leadLimit: env.leadBatchDefaultLimit,
    runTime: env.leadDefaultRuntime,
    niches: [
      "clinica medica",
      "clinica odontologica",
      "escritorio contabil",
      "imobiliaria",
      "escola particular",
      "autopecas",
      "distribuidora",
      "transportadora",
      "material de construcao",
      "industria"
    ],
    cities: ["Curitiba", "Sao Jose dos Pinhais"],
    nationwide: false,
    priorityCities: ["Curitiba", "Sao Jose dos Pinhais"],
    secondaryCities: ["Pinhais", "Colombo", "Araucaria", "Campo Largo"],
    active: true
  });

  const config = await readJsonFile(configPath, fallback);
  return normalizeConfigGeography(config);
}

export async function saveConfig(input) {
  const parsed = configInputSchema.parse(input);
  const normalized = normalizeConfigGeography(parsed);
  await writeJsonFile(configPath, normalized);
  return normalized;
}

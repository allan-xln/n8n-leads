import { env } from "../config/env.js";
import { getConfig } from "../services/configStore.js";
import { getLatestLeadBatch, registerLeadHistory, saveLatestLeadBatch } from "../services/leadStore.js";
import { runLeadQualification } from "../services/leadOrchestrator.js";
import { createWhatsAppDispatchPreview } from "../services/whatsappDispatchService.js";
import { runInputSchema } from "../types/config.js";

export async function runLeadBatch(request, response, next) {
  try {
    const payload = runInputSchema.parse(request.body ?? {});
    const config = await getConfig();

    if (!config.active) {
      response.status(409).json({
        message: "A rotina esta inativa. Ative a configuracao para executar.",
        config
      });
      return;
    }

    const batchLimit = Math.min(payload.limit || config.leadLimit, env.leadBatchMaxLimit);
    const result = await runLeadQualification(config, {
      reason: payload.reason || "manual-run",
      limit: batchLimit
    });
    const whatsappDispatch = await createWhatsAppDispatchPreview({
      destinationWhatsApp: config.destinationWhatsApp,
      digest: result.digest,
      summary: result.summary,
      leads: result.leads
    });

    const batch = {
      ...result,
      reason: payload.reason || "manual-run",
      config,
      whatsappDispatch
    };

    await registerLeadHistory(batch.leads);
    await saveLatestLeadBatch(batch);
    response.json(batch);
  } catch (error) {
    next(error);
  }
}

export async function fetchLatestLeadBatch(_request, response, next) {
  try {
    const batch = await getLatestLeadBatch();
    response.json(batch);
  } catch (error) {
    next(error);
  }
}

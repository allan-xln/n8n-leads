import { getConfig, saveConfig } from "../services/configStore.js";

export async function fetchConfig(_request, response, next) {
  try {
    const config = await getConfig();
    response.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(request, response, next) {
  try {
    const config = await saveConfig(request.body);
    response.json({
      message: "Configuracao salva com sucesso.",
      config
    });
  } catch (error) {
    next(error);
  }
}

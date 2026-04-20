const backendUrl = window.APP_CONFIG?.backendUrl || "http://localhost:8095";

const form = document.querySelector("#config-form");
const loadConfigButton = document.querySelector("#load-config");
const runNowButton = document.querySelector("#run-now");
const apiStatus = document.querySelector("#api-status");
const toast = document.querySelector("#toast");
let currentConfig = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 2200);
}

function toLines(items) {
  return (items || []).join("\n");
}

function fromLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForm(config) {
  currentConfig = config;
  form.destinationWhatsApp.value = config.destinationWhatsApp || "";
  form.niches.value = toLines(config.niches);
}

async function request(path, options = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Erro ao comunicar com a API.");
  }

  return response.json();
}

async function loadHealth() {
  try {
    await request("/health");
    apiStatus.textContent = "API online";
  } catch (_error) {
    apiStatus.textContent = "API indisponivel";
  }
}

async function loadConfig() {
  const config = await request("/api/config");
  fillForm(config);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentConfig) {
    await loadConfig();
  }

  const payload = {
    destinationWhatsApp: form.destinationWhatsApp.value.trim(),
    leadLimit: Number(currentConfig?.leadLimit || 20),
    runTime: currentConfig?.runTime || "05:00",
    niches: fromLines(form.niches.value),
    priorityCities: currentConfig?.priorityCities || currentConfig?.cities || [],
    secondaryCities: currentConfig?.secondaryCities || [],
    cities: currentConfig?.cities || [],
    nationwide: Boolean(currentConfig?.nationwide),
    active: currentConfig?.active !== false
  };

  const response = await request("/api/config", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  fillForm(response.config);

  showToast("Configuracao salva.");
});

loadConfigButton.addEventListener("click", async () => {
  await loadConfig();
  showToast("Configuracao recarregada.");
});

runNowButton.addEventListener("click", async () => {
  await request("/api/run", {
    method: "POST",
    body: JSON.stringify({ reason: "frontend-manual-run" })
  });

  showToast("Lote executado com sucesso.");
});

async function bootstrap() {
  try {
    await Promise.all([loadHealth(), loadConfig()]);
  } catch (error) {
    showToast(error.message);
  }
}

bootstrap();

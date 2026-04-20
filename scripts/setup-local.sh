#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado no PATH. Ajuste o ambiente local antes de rodar o setup." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado no PATH. Ajuste o ambiente local antes de rodar o setup." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

mkdir -p data n8n/data

if [ ! -f "data/config.json" ]; then
  cp configs/default-config.json data/config.json
fi

if [ ! -f "data/latest-leads.json" ]; then
  cat <<'EOF' > data/latest-leads.json
{
  "generatedAt": null,
  "reason": "not-run-yet",
  "summary": {
    "totalQualified": 0,
    "averageScore": 0,
    "highPriorityCount": 0
  },
  "digest": {
    "headline": "Nenhum lote executado ainda.",
    "recommendations": [],
    "topSegments": []
  },
  "providerDiagnostics": [],
  "whatsappDispatch": {
    "providerName": "mockWhatsAppProvider",
    "mode": "mock",
    "status": "not-run-yet",
    "dispatched": false,
    "fallbackUsed": false,
    "payload": {
      "destination": "",
      "messagePreview": "",
      "status": "not-run-yet"
    },
    "diagnostics": []
  },
  "leads": []
}
EOF
fi

npm install

echo "Ambiente preparado com sucesso."

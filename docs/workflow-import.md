# Importação do Workflow no n8n

## Arquivo

Use [`n8n/workflows/lead-daily-digest.json`](../n8n/workflows/lead-daily-digest.json).

## Passos

1. Suba o n8n com `docker compose up -d n8n`.
2. Acesse `http://localhost:5678`.
3. Clique em `Import from File`.
4. Escolha o arquivo do workflow.
5. Abra o nó `Run Lead Qualification`.
6. Confirme a URL do backend:
   - No fluxo atual validado: `http://host.docker.internal:8095/api/run`
   - Se mudar a porta local do backend, ajuste a URL do nó `HTTP Request`.
7. Ative o workflow.

## Observações

- O cron já está configurado para `05:00`, `10:00` e `15:00` em `America/Sao_Paulo`, apenas de segunda a sexta.
- O workflow agendado envia `limit: 20` no `POST /api/run`.
- O backend agora pode enviar o WhatsApp diretamente durante o `/api/run`, se `WHATSAPP_PROVIDER=http` e `WHATSAPP_DISPATCH_ENABLED=true`.
- O último nó do workflow serve apenas para inspecionar o resultado do dispatch retornado pelo backend.
- O backend precisa estar ativo para o workflow funcionar.
- Se você já importou uma versão anterior do workflow, nao e obrigatorio reimportar para o envio funcionar: basta manter o nó `Run Lead Qualification` apontando para o backend. Reimporte apenas se quiser o fluxo atualizado visualmente.

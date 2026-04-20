# Lead Qualification Hub com n8n

Projeto local, profissional e pronto para evoluir, voltado para captação, organização e qualificação de leads com foco em serviços técnicos e comerciais como automação, desenvolvimento de software, suporte de TI, integrações, bots e fluxos operacionais.

O n8n atua como orquestrador principal. Um backend auxiliar expõe APIs locais, persiste configuração e executa a geração/qualificação dos leads. Um frontend leve permite configurar o destino e testar a operação sem depender de IDE específica ou credenciais finais.

## Visão Geral

O sistema foi desenhado para funcionar localmente primeiro, com uma trilha simples para subir depois em VPS:

- `apps/backend`: API Express para configuração, execução manual e geração de lotes qualificados.
- `apps/frontend`: painel local para configurar número de WhatsApp, nichos, geografia, limite diário e horário.
- `n8n/workflows`: workflow inicial pronto para importação no n8n.
- `data`: persistência local em JSON para acelerar o MVP sem sacrificar organização.
- `docker-compose.yml`: stack pronta com backend, frontend e n8n.

Mesmo sem credenciais externas, o projeto já roda com dados mock realistas, fallback operacional explícito e arquitetura preparada para múltiplos providers de leads e WhatsApp.

## Arquitetura

```text
Frontend local
  -> consome API do backend
  -> salva configuração e dispara testes

Backend Express
  -> persiste config e últimos leads em JSON
  -> consulta providers de leads
  -> qualifica, prioriza e gera digest
  -> expõe endpoints para o n8n

n8n
  -> agenda execução diária às 05:00
  -> chama POST /api/run
  -> recebe digest consolidado
  -> fica pronto para etapa futura de envio por WhatsApp
```

## Stack

- Node.js
- Express
- Frontend HTML/CSS/JS puro com servidor Node leve
- Docker e Docker Compose
- n8n em container
- Persistência local em JSON
- `dotenv`, `axios`, `zod`, `cors`

## Estrutura de Pastas

```text
.
├── apps
│   ├── backend
│   │   ├── src
│   │   │   ├── config
│   │   │   ├── controllers
│   │   │   ├── data
│   │   │   ├── providers
│   │   │   ├── routes
│   │   │   ├── services
│   │   │   ├── types
│   │   │   └── utils
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend
│       ├── src
│       ├── Dockerfile
│       ├── package.json
│       └── server.mjs
├── configs
│   └── default-config.json
├── data
│   ├── mock-leads.json
│   └── .gitkeep
├── docs
│   ├── architecture.md
│   ├── provider-integration.md
│   └── workflow-import.md
├── n8n
│   ├── data
│   │   └── .gitkeep
│   └── workflows
│       └── lead-daily-digest.json
├── scripts
│   ├── run-dev.sh
│   └── setup-local.sh
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## Como Rodar Localmente

### 1. Preparar ambiente

```bash
cp .env.example .env
npm run setup
```

O script instala as dependências dos workspaces e cria os arquivos locais de dados se ainda não existirem.

### 2. Rodar backend e frontend em modo local

```bash
npm run dev
```

URLs padrão:

- Frontend: `http://localhost:4173`
- Backend: `http://localhost:8095`

### 3. Subir o n8n com Docker Compose

```bash
docker compose up -d n8n
```

Ou subir a stack completa em containers:

```bash
docker compose up -d --build
```

URLs padrão:

- n8n: `http://localhost:5678`
- Frontend em container: `http://localhost:4173`
- Backend em container: `http://localhost:8095`

## Variáveis de Ambiente

Use o arquivo `.env` baseado em `.env.example`. O projeto foi preparado para exigir o mínimo de ajustes manuais: em um ambiente com `node`, `npm`, `docker` e `docker compose` disponíveis no `PATH`, basta copiar o `.env` e rodar os comandos documentados aqui.

### Principais

- `BACKEND_PORT`: porta da API local.
- `FRONTEND_PORT`: porta do painel local.
- `LEAD_BATCH_DEFAULT_LIMIT`: quantidade padrão por execução.
- `LEAD_BATCH_MAX_LIMIT`: teto de leads por dia.
- `LEAD_DEFAULT_RUNTIME`: horário padrão configurado para a rotina.
- `LEAD_GEOGRAPHIC_FOCUS`: rótulo documental do foco geográfico principal atual.
- `MOCK_PROVIDER_MODE`: define se o mock roda sempre (`always`) ou apenas como fallback (`fallback`).
- `WHATSAPP_PROVIDER`, `WHATSAPP_DISPATCH_ENABLED`, `WHATSAPP_API_PROVIDER_KIND`, `WHATSAPP_API_BASE_URL`, `WHATSAPP_API_TOKEN`: provider de WhatsApp opcional.
- `LEAD_EXTERNAL_API_PROVIDER_KIND`, `LEAD_EXTERNAL_API_PROVIDER_NAME`, `LEAD_EXTERNAL_API_BASE_URL`, `LEAD_EXTERNAL_API_TOKEN`, `GOOGLE_PLACES_API_KEY`: provider real de leads.
- `N8N_*`: variáveis do container do n8n.

## Estratégia Geográfica

O backend agora suporta uma estratégia geográfica incremental sem quebrar o contrato anterior:

- `nationwide`: permite cobertura nacional sem remover o foco principal.
- `priorityCities`: cidades com maior peso comercial e maior score.
- `secondaryCities`: cidades aceitas com peso intermediário.
- `cities`: lista combinada mantida por compatibilidade com frontend antigo, workflow e integrações.

Configuração inicial recomendada:

- `priorityCities`: `Curitiba`, `Sao Jose dos Pinhais`
- `secondaryCities`: `Pinhais`, `Colombo`, `Araucaria`, `Campo Largo`
- `nationwide`: `false`

No scoring:

- cidade prioritária recebe bônus maior
- cidade secundária recebe bônus moderado
- cidade fora do foco principal recebe penalização
- quando `nationwide=true`, leads fora das cidades foco deixam de ser fortemente penalizados

## Providers e Integrações Reais

O projeto agora tem dois níveis claros de execução:

- real:
  - provider HTTP opcional para leads
  - provider HTTP opcional para WhatsApp
- mock:
  - provider mock de leads para operação local
  - provider mock de WhatsApp para preview e fallback

O projeto já sai com interfaces e contratos prontos para evoluir sem retrabalho:

- Lead providers:
  - `apps/backend/src/providers/mockLeadProvider.js`
  - `apps/backend/src/providers/externalLeadProvider.js`
  - `apps/backend/src/providers/googlePlacesLeadProvider.js`
  - `apps/backend/src/providers/leadProviderFactory.js`
- WhatsApp dispatch preview:
  - `apps/backend/src/providers/mockWhatsAppProvider.js`
  - `apps/backend/src/providers/httpWhatsAppProvider.js`
  - `apps/backend/src/services/whatsappDispatchService.js`

### Como plugar um provider real de leads

O backend agora suporta dois modos de provider real:

1. `generic`
2. `google_places`

### Provider HTTP genérico

1. Exponha uma API real em `LEAD_EXTERNAL_API_BASE_URL`.
2. Ative `EXTERNAL_PROVIDER_ENABLED=true`.
3. Use `LEAD_EXTERNAL_API_PROVIDER_KIND=generic`.
4. Configure opcionalmente `LEAD_EXTERNAL_API_PROVIDER_NAME` para identificar o provider nos diagnósticos.
5. Configure `LEAD_EXTERNAL_API_TOKEN` apenas se a API exigir autenticação.
6. Ajuste opcionalmente `LEAD_EXTERNAL_API_METHOD`, `LEAD_EXTERNAL_API_PATH`, `LEAD_EXTERNAL_API_RESPONSE_PATH`, `LEAD_EXTERNAL_API_TIMEOUT_MS`, `LEAD_EXTERNAL_API_AUTH_SCHEME`, `LEAD_EXTERNAL_API_AUTH_HEADER` e `LEAD_EXTERNAL_API_HEADERS_JSON`.
7. O backend enviará `cities`, `nationwide`, `priorityCities`, `secondaryCities`, `geography` e `requestContext.primaryFocusLabel` no payload.
8. O backend suporta respostas em array direto ou em caminhos como `leads`, `data.leads` ou outro caminho configurado em `LEAD_EXTERNAL_API_RESPONSE_PATH`.
9. Garanta que a API responda algo como:

```json
{
  "niches": ["automacao de processos", "integracoes"],
  "cities": ["Curitiba", "Sao Jose dos Pinhais", "Pinhais"],
  "nationwide": false,
  "priorityCities": ["Curitiba", "Sao Jose dos Pinhais"],
  "secondaryCities": ["Pinhais"],
  "geography": {
    "nationwide": false,
    "priorityCities": ["Curitiba", "Sao Jose dos Pinhais"],
    "secondaryCities": ["Pinhais"],
    "cities": ["Curitiba", "Sao Jose dos Pinhais", "Pinhais"],
    "primaryFocusLabel": "Curitiba, Sao Jose dos Pinhais"
  },
  "limit": 20,
  "requestContext": {
    "runTime": "05:00",
    "destinationWhatsApp": "5541...",
    "primaryFocusLabel": "Curitiba, Sao Jose dos Pinhais",
    "reason": "manual-run"
  }
}
```

E a resposta pode ser, por exemplo:

```json
{
  "leads": [
    {
      "id": "lead-123",
      "companyName": "Empresa Exemplo",
      "segment": "clinicas",
      "city": "Sao Paulo",
      "region": "SP",
      "contactName": "Contato",
      "website": "https://empresa.com",
      "painPoints": ["agendamento manual"],
      "desiredOutcomes": ["automacao"],
      "companySize": "medium",
      "digitalMaturity": "medium",
      "budgetBand": "mid",
      "urgency": "high",
      "source": "external_api"
    }
  ]
}
```

### Provider Google Places API (New)

1. Ative `EXTERNAL_PROVIDER_ENABLED=true`.
2. Use `LEAD_EXTERNAL_API_PROVIDER_KIND=google_places`.
3. Configure `GOOGLE_PLACES_API_KEY`.
4. Opcionalmente ajuste `GOOGLE_PLACES_MAX_CALLS_PER_RUN`, `GOOGLE_PLACES_MAX_RESULTS_PER_QUERY`, `GOOGLE_PLACES_DAILY_CALL_LIMIT` e `GOOGLE_PLACES_MONTHLY_CALL_LIMIT`.
5. O backend consulta `POST https://places.googleapis.com/v1/places:searchText` com `X-Goog-Api-Key` e `X-Goog-FieldMask`, usando queries baseadas em `niches` e cidades priorizadas.
6. O estado de consumo fica em `data/places-usage.json` e bloqueia chamadas ao atingir limite diário ou mensal.
7. Ao bloquear por quota ou ocorrer falha operacional, o mock continua como fallback sem quebrar `/api/run`.

Exemplo de configuracao:

```env
EXTERNAL_PROVIDER_ENABLED=true
LEAD_EXTERNAL_API_PROVIDER_KIND=google_places
MOCK_PROVIDER_ENABLED=true
MOCK_PROVIDER_MODE=fallback
GOOGLE_PLACES_API_KEY=sua-chave
GOOGLE_PLACES_MAX_RESULTS_PER_QUERY=5
GOOGLE_PLACES_MAX_CALLS_PER_RUN=8
GOOGLE_PLACES_DAILY_CALL_LIMIT=100
GOOGLE_PLACES_MONTHLY_CALL_LIMIT=2000
```

### Como plugar um envio real de WhatsApp

1. Configure `WHATSAPP_PROVIDER=http`.
2. Defina `WHATSAPP_API_BASE_URL`.
3. Se o gateway exigir, defina `WHATSAPP_API_TOKEN`.
4. Ajuste `WHATSAPP_API_PROVIDER_KIND`:
   - `generic`: corpo configuravel com `WHATSAPP_API_DESTINATION_FIELD` e `WHATSAPP_API_MESSAGE_FIELD`
   - `evolution`: corpo pronto com `number` e `text`, aceitando `WHATSAPP_API_INSTANCE`
5. Ative `WHATSAPP_DISPATCH_ENABLED=true` apenas quando quiser envio real.
6. O backend normaliza numeros brasileiros como `41 98416-6423` para `5541984166423` no envio.
7. O objeto `whatsappDispatch` retornado pelo backend continua disponivel para frontend e n8n com diagnosticos do envio.

Exemplo de configuracao para gateway generico:

```env
WHATSAPP_PROVIDER=http
WHATSAPP_DISPATCH_ENABLED=true
WHATSAPP_API_PROVIDER_KIND=generic
WHATSAPP_API_BASE_URL=https://seu-gateway.example.com
WHATSAPP_API_PATH=/messages
WHATSAPP_API_TOKEN=seu-token
WHATSAPP_API_AUTH_SCHEME=Bearer
WHATSAPP_API_AUTH_HEADER=Authorization
WHATSAPP_API_DESTINATION_FIELD=to
WHATSAPP_API_MESSAGE_FIELD=message
```

Exemplo de configuracao para Evolution API:

```env
WHATSAPP_PROVIDER=http
WHATSAPP_DISPATCH_ENABLED=true
WHATSAPP_API_PROVIDER_KIND=evolution
WHATSAPP_API_BASE_URL=https://seu-host-evolution.example.com
WHATSAPP_API_PATH=/message/sendText/{instance}
WHATSAPP_API_INSTANCE=minha-instancia
WHATSAPP_API_TOKEN=seu-token
WHATSAPP_API_AUTH_SCHEME=
WHATSAPP_API_AUTH_HEADER=apikey
WHATSAPP_API_RESPONSE_PATH=
```

### Como funciona o fallback

- Leads:
  - se o provider HTTP estiver desabilitado, o mock assume a operacao local
  - se o provider HTTP falhar, exceder timeout ou retornar zero leads e `MOCK_PROVIDER_ENABLED=true`, o mock entra como fallback
  - se o provider Google Places atingir limite diario ou mensal, nenhuma chamada e feita e o mock assume como fallback
  - `providerDiagnostics` passa a registrar tambem `errorCode`, `timeoutMs`, `primaryFocusLabel`, `nationwide`, `priorityCities`, `secondaryCities`, `usageSnapshot` e `quotaReason`
- WhatsApp:
  - se `WHATSAPP_PROVIDER=mock`, o sistema sempre gera preview local
  - se `WHATSAPP_PROVIDER=http` mas faltar configuracao minima, o sistema cai para mock sem quebrar o lote
  - se `WHATSAPP_PROVIDER=http` e `WHATSAPP_DISPATCH_ENABLED=false`, o backend gera preview HTTP sem enviar mensagem
  - se o envio HTTP falhar ou exceder timeout, o backend retorna fallback mock com diagnostico

Guia complementar em [`docs/provider-integration.md`](docs/provider-integration.md).

## Endpoints da API

### `GET /health`

Retorna status do backend, horário e informações básicas do ambiente.

### `GET /api/config`

Retorna a configuração ativa consumida pelo frontend e pelo n8n.

### `POST /api/config`

Salva configuração operacional:

```json
{
  "destinationWhatsApp": "5511999999999",
  "leadLimit": 20,
  "runTime": "05:00",
  "niches": ["clinicas", "escritorios contabeis"],
  "nationwide": false,
  "priorityCities": ["Curitiba", "Sao Jose dos Pinhais"],
  "secondaryCities": ["Pinhais", "Colombo"],
  "cities": ["Curitiba", "Sao Jose dos Pinhais", "Pinhais", "Colombo"],
  "active": true
}
```

### `POST /api/run`

Executa manualmente um lote de leads com qualificação e digest final. Aceita overrides opcionais:

```json
{
  "reason": "manual-test",
  "limit": 15
}
```

### `GET /api/leads/latest`

Retorna o último lote gerado, com resumo, score, justificativa e prioridade.

## Fluxo de Qualificação

Cada lead recebe:

- `score`: valor numérico final.
- `signals`: sinais detectados.
- `suggestedOffer`: oferta sugerida.
- `priority`: `high`, `medium` ou `low`.
- `justification`: resumo objetivo do porquê aquele lead tem potencial.

O score considera, entre outros:

- aderência ao nicho prioritário
- aderência geográfica
- sinais de dor operacional
- maturidade digital
- urgência percebida
- orçamento estimado
- tamanho da operação

O retorno do lote também inclui:

- `providerDiagnostics`: status e volume retornado por cada provider.
- `whatsappDispatch`: resultado do dispatch, com preview, fallback ou envio real conforme configuracao.

## Workflow Inicial do n8n

O arquivo [`n8n/workflows/lead-daily-digest.json`](n8n/workflows/lead-daily-digest.json) já está pronto para importação.

Ele contém:

- gatilho agendado para 05:00
- requisição HTTP para `POST /api/run`
- etapa de normalização do digest
- nó placeholder para futura integração com WhatsApp

Guia rápido:

1. Abra o n8n.
2. Importe o arquivo do workflow.
3. Ajuste a URL do backend se necessário.
4. Ative o workflow.

Mais detalhes em [`docs/workflow-import.md`](docs/workflow-import.md).

## Teste Manual

### Via frontend

1. Abra o painel local.
2. Salve a configuração desejada.
3. Clique em "Executar agora".
4. Confira o lote retornado e o resumo final.

### Via curl

```bash
curl http://localhost:8095/health
curl http://localhost:8095/api/config
curl -X POST http://localhost:8095/api/run -H "Content-Type: application/json" -d '{"reason":"manual-test"}'
curl http://localhost:8095/api/leads/latest
```

## Deploy Futuro em VPS

Fluxo recomendado:

1. Copiar o projeto para a VPS.
2. Criar `.env` com URLs e credenciais reais.
3. Subir com `docker compose up -d --build`.
4. Configurar reverse proxy se desejar domínio e HTTPS.
5. Conectar o workflow do n8n à futura camada de WhatsApp.

Como a arquitetura já está separada por apps e providers, a troca de dados mock por integrações reais exige pouca fricção.

## Limitações Atuais

- O provider HTTP de leads depende de uma API externa compatível com o contrato documentado.
- O envio HTTP de WhatsApp depende de um endpoint externo compatível com o payload gerado pelo backend.
- A persistência está em JSON para acelerar o MVP; SQLite pode entrar facilmente na próxima etapa.
- O workflow do n8n está pronto para importação, mas depende do backend estar acessível na URL configurada.

## Próximos Passos Recomendados

1. Conectar um provider real de leads ou sinais comerciais.
2. Adicionar SQLite para histórico completo e auditoria.
3. Integrar WhatsApp Cloud API, Z-API, Evolution API ou provedor equivalente.
4. Acrescentar autenticação simples no painel.
5. Criar uma régua de follow-up com templates por tipo de oferta.

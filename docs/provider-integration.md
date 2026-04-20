# Providers e Integrações

## Lead Providers

O backend usa uma factory para registrar múltiplos providers:

- [`apps/backend/src/providers/mockLeadProvider.js`](../apps/backend/src/providers/mockLeadProvider.js)
- [`apps/backend/src/providers/externalLeadProvider.js`](../apps/backend/src/providers/externalLeadProvider.js)
- [`apps/backend/src/providers/googlePlacesLeadProvider.js`](../apps/backend/src/providers/googlePlacesLeadProvider.js)
- [`apps/backend/src/providers/leadProviderFactory.js`](../apps/backend/src/providers/leadProviderFactory.js)
- [`apps/backend/src/providers/leadProviderRuntime.js`](../apps/backend/src/providers/leadProviderRuntime.js)

### Contrato esperado

Cada provider precisa expor:

- `name`
- `kind`
- `isEnabled()`
- `fetchLeads(config, options)`

E retornar uma lista de leads no formato:

```json
{
  "id": "lead-001",
  "companyName": "Empresa",
  "segment": "clinicas",
  "city": "Sao Paulo",
  "region": "SP",
  "contactName": "Maria",
  "website": "https://empresa.com",
  "painPoints": ["processos manuais"],
  "desiredOutcomes": ["automacao"],
  "companySize": "medium",
  "digitalMaturity": "medium",
  "budgetBand": "mid",
  "urgency": "high",
  "source": "external"
}
```

### Fallback de leads

- `MOCK_PROVIDER_MODE=fallback`: provider mock entra apenas quando nao houver resultado operacional do provider principal.
- `MOCK_PROVIDER_MODE=always`: provider mock roda junto do principal.
- `MOCK_PROVIDER_ENABLED=true`: habilita operacao local e fallback.

### Variaveis do provider HTTP de leads

- `EXTERNAL_PROVIDER_ENABLED=true`
- `LEAD_EXTERNAL_API_PROVIDER_KIND`
- `LEAD_EXTERNAL_API_PROVIDER_NAME`
- `LEAD_EXTERNAL_API_BASE_URL`
- `LEAD_EXTERNAL_API_METHOD`
- `LEAD_EXTERNAL_API_PATH`
- `LEAD_EXTERNAL_API_RESPONSE_PATH`
- `LEAD_EXTERNAL_API_TOKEN`
- `LEAD_EXTERNAL_API_TIMEOUT_MS`
- `LEAD_EXTERNAL_API_AUTH_SCHEME`
- `LEAD_EXTERNAL_API_AUTH_HEADER`
- `LEAD_EXTERNAL_API_HEADERS_JSON`

### Provider Google Places API (New)

Para usar Google Places como fonte real:

- `EXTERNAL_PROVIDER_ENABLED=true`
- `LEAD_EXTERNAL_API_PROVIDER_KIND=google_places`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_PLACES_API_URL`
- `GOOGLE_PLACES_FIELD_MASK`
- `GOOGLE_PLACES_TIMEOUT_MS`
- `GOOGLE_PLACES_LANGUAGE_CODE`
- `GOOGLE_PLACES_REGION_CODE`
- `GOOGLE_PLACES_MAX_RESULTS_PER_QUERY`
- `GOOGLE_PLACES_MAX_CALLS_PER_RUN`
- `GOOGLE_PLACES_DAILY_CALL_LIMIT`
- `GOOGLE_PLACES_MONTHLY_CALL_LIMIT`

O provider usa `POST /v1/places:searchText` da Places API (New) com:

- `X-Goog-Api-Key`
- `X-Goog-FieldMask`
- body com `textQuery`, `languageCode`, `regionCode` e `pageSize`

Exemplo de request conceitual:

```json
{
  "textQuery": "automacao de processos em Curitiba, Brasil",
  "languageCode": "pt-BR",
  "regionCode": "BR",
  "pageSize": 5
}
```

O backend converte os resultados em leads no shape ja esperado por `/api/run`.

### Trava de custo e cota

O uso da Places API e persistido em:

- `data/places-usage.json`

Regras:

- a reserva de chamada acontece antes de cada request real
- se o limite diario for atingido, a API nao e chamada
- se o limite mensal for atingido, a API nao e chamada
- o contador diario reseta quando muda o dia
- o contador mensal reseta quando muda o mes
- ao bloquear por cota, o provider registra diagnostico claro e o mock assume como fallback

### Payload geografico enviado ao provider real

O backend envia, alem de `niches`, `cities` e `limit`:

- `nationwide`
- `priorityCities`
- `secondaryCities`
- `geography`
- `requestContext.primaryFocusLabel`
- `requestContext.reason`

Isso permite um provider real respeitar foco principal em Curitiba e Sao Jose dos Pinhais, sem perder compatibilidade com o contrato legado baseado em `cities`.

Exemplo de payload:

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

### Contrato HTTP recomendado

- Metodo: `POST` por padrao, com suporte a `GET`.
- Timeout: controlado por `LEAD_EXTERNAL_API_TIMEOUT_MS`.
- Autenticacao: header configuravel, padrao `Authorization: Bearer <token>`, mas opcional.
- Headers extras: opcionais via `LEAD_EXTERNAL_API_HEADERS_JSON`.

### Formatos de resposta suportados

O backend consegue extrair leads quando a resposta vier como:

```json
[
  {
    "id": "lead-001",
    "companyName": "Empresa",
    "segment": "clinicas",
    "city": "Curitiba",
    "region": "PR",
    "contactName": "Maria"
  }
]
```

Ou:

```json
{
  "leads": [
    {
      "id": "lead-001",
      "companyName": "Empresa",
      "segment": "clinicas",
      "city": "Curitiba",
      "region": "PR",
      "contactName": "Maria"
    }
  ]
}
```

Ou qualquer caminho configurado em `LEAD_EXTERNAL_API_RESPONSE_PATH`, por exemplo `data.leads`.

### Diagnosticos do provider real

Quando o provider HTTP executa, `providerDiagnostics` pode incluir:

- `requestUrl`
- `requestMethod`
- `responseStatus`
- `responsePath`
- `errorCode`
- `timeoutMs`
- `primaryFocusLabel`
- `nationwide`
- `priorityCities`
- `secondaryCities`
- `responseContentType`
- `queryCountPlanned`
- `queryCountExecuted`
- `usageFilePath`
- `usageSnapshot`
- `quotaBlocked`
- `quotaReason`

## WhatsApp

O backend agora gera um resultado de dispatch desacoplado:

- [`apps/backend/src/providers/mockWhatsAppProvider.js`](../apps/backend/src/providers/mockWhatsAppProvider.js)
- [`apps/backend/src/providers/httpWhatsAppProvider.js`](../apps/backend/src/providers/httpWhatsAppProvider.js)
- [`apps/backend/src/services/whatsappDispatchService.js`](../apps/backend/src/services/whatsappDispatchService.js)

### Estratégia atual

- `mock`: gera um payload previsível para teste local.
- `http`: monta a estrutura de requisição e pode enviar de verdade quando habilitado.

### Como evoluir

1. Ajuste `WHATSAPP_PROVIDER=http`.
2. Configure `WHATSAPP_API_BASE_URL`.
3. Se necessario, configure `WHATSAPP_API_TOKEN`.
4. Escolha `WHATSAPP_API_PROVIDER_KIND`:
   - `generic`
   - `evolution`
5. Ative `WHATSAPP_DISPATCH_ENABLED=true` quando quiser disparo real pelo backend.
6. Use `whatsappDispatch.payload` como contrato inicial e `whatsappDispatch.providerDiagnostics` para auditar envio real.
7. Se o gateway usar token cru em vez de `Bearer`, deixe `WHATSAPP_API_AUTH_SCHEME=` vazio.

### Variaveis do provider HTTP de WhatsApp

- `WHATSAPP_PROVIDER=http`
- `WHATSAPP_DISPATCH_ENABLED=true`
- `WHATSAPP_API_PROVIDER_NAME`
- `WHATSAPP_API_PROVIDER_KIND`
- `WHATSAPP_API_BASE_URL`
- `WHATSAPP_API_PATH`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_API_TIMEOUT_MS`
- `WHATSAPP_API_AUTH_SCHEME`
- `WHATSAPP_API_AUTH_HEADER`
- `WHATSAPP_API_HEADERS_JSON`
- `WHATSAPP_API_INSTANCE`
- `WHATSAPP_API_DESTINATION_FIELD`
- `WHATSAPP_API_MESSAGE_FIELD`
- `WHATSAPP_API_RESPONSE_PATH`
- `WHATSAPP_API_EXTRA_BODY_JSON`
- `WHATSAPP_API_SOURCE_NUMBER`

### Contrato pratico de envio

O backend normaliza o numero de destino antes do envio.

Exemplo:

- configurado no frontend: `41 98416-6423`
- enviado ao provider: `5541984166423`

Para `generic`, o body fica no formato:

```json
{
  "to": "5541984166423",
  "message": "Lead digest: 3 leads qualificados. ...",
  "metadata": {
    "sourceNumber": null,
    "totalQualified": 3,
    "highPriorityCount": 2,
    "topLeadId": "lead-009",
    "headline": "3 leads qualificados para 5541984166423."
  }
}
```

Para `evolution`, o body fica no formato:

```json
{
  "number": "5541984166423",
  "text": "Lead digest: 3 leads qualificados. ...",
  "delay": 1200,
  "metadata": {
    "sourceNumber": null,
    "totalQualified": 3,
    "highPriorityCount": 2,
    "topLeadId": "lead-009",
    "headline": "3 leads qualificados para 5541984166423."
  }
}
```

### Fallback de WhatsApp

- Sem configuracao minima: fallback automatico para mock.
- Envio desabilitado: provider HTTP fica em `preview-only`.
- Erro HTTP ou timeout: fallback automatico para mock com diagnosticos.

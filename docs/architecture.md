# Arquitetura do MVP

## Objetivo

Entregar uma base local sólida para captação e qualificação de leads usando n8n como orquestrador principal, sem travar o desenvolvimento por falta de credenciais externas.

## Decisões

- Persistência em JSON para acelerar o MVP.
- Backend em Express com serviços separados por responsabilidade.
- Providers de leads desacoplados para permitir múltiplas fontes.
- Qualificação centralizada em um serviço próprio.
- Frontend simples e leve, com foco em operação e teste rápido.
- n8n isolado como camada de orquestração agendada.

## Serviços

### Backend

- `configStore`: leitura e gravação da configuração ativa.
- `leadStore`: persistência do último lote de leads qualificados.
- `leadProviderFactory`: plano de providers principais e fallback.
- `leadProviderRuntime`: normalização, execução segura e diagnostico por provider.
- `leadScoringService`: pontuação, prioridade, sinais positivos/negativos e oferta sugerida.
- `leadOrchestrator`: coordena providers, filtros, score e digest.
- `whatsappDispatchService`: preview, envio opcional e fallback mock para WhatsApp.

### Frontend

- Formulário para configuração operacional.
- Ação manual para disparar geração de leads.
- Visualização do último lote e do digest consolidado.

### n8n

- Gatilho diário às 05:00.
- HTTP Request para o backend.
- Normalização do payload.
- Nó placeholder para futura entrega em WhatsApp.

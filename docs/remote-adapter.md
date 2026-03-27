# Remote Adapter

## Onde está
- Adapter remoto: [plannerRemoteAdapter.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerRemoteAdapter.ts)
- Cliente HTTP mínimo: [remoteClient.ts](/home/dns/Desenvolvimento/Planejador/src/application/remoteClient.ts)
- Seleção de adapter: [createPlannerAppAdapter.ts](/home/dns/Desenvolvimento/Planejador/src/application/createPlannerAppAdapter.ts)

## Como a seleção funciona
Por padrão, a aplicação continua usando o adapter local.

Para preparar o modo remoto, use:

```bash
VITE_PLANNER_ADAPTER=remote
VITE_PLANNER_API_BASE_URL=http://localhost:3000
VITE_PLANNER_API_TIMEOUT_MS=10000
```

Sem essas variáveis, o bootstrap continua em modo local.

## O que o adapter remoto faz
- implementa a mesma [plannerAppPort.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerAppPort.ts)
- usa `fetch`
- consome os contratos de [remoteContracts.ts](/home/dns/Desenvolvimento/Planejador/src/application/remoteContracts.ts)
- traduz envelopes HTTP/JSON para os contratos internos da aplicação
- converte falhas de rede, timeout e erro HTTP para o modelo operacional já consumido pela UI

## O que ainda falta para funcionar com API real
- backend respondendo os endpoints definidos em [backend-api-design.md](/home/dns/Desenvolvimento/Planejador/docs/backend-api-design.md)
- respostas compatíveis com os envelopes remotos
- carga inicial remota de `PlannerData`, se a aplicação deixar de nascer com mock local
- eventual refinamento de estratégia otimista/pessimista por operação

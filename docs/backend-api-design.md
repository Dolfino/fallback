# Backend API Design

## Objetivo
Este documento traduz a borda atual definida por [plannerAppPort](/home/dns/Desenvolvimento/Planejador/src/application/plannerAppPort.ts) em uma API HTTP/JSON real, sem quebrar o modo local atual e sem implementar servidor nesta etapa.

O princípio é simples:
- o domínio local continua sendo a fonte de verdade conceitual
- a porta de aplicação continua sendo a fronteira do frontend
- uma implementação remota futura só precisa mapear HTTP para os contratos já previstos

## Escopo da API
A API futura cobre duas categorias:
- mutações de domínio: alteram estado operacional e retornam impacto já calculado
- consultas derivadas: devolvem leituras prontas para a UI

Comandos puramente de UI não devem virar endpoint remoto:
- `toggle_detail_panel`: permanece local

Comandos híbridos:
- `select_next_focus`: hoje existe como comando local, mas na API futura faz mais sentido como consulta derivada ou já embutido no resumo do dia

## Inventário da Porta Atual

| Operação da porta | Categoria | Tipo | Entrada principal | Saída principal | Retry |
| --- | --- | --- | --- | --- | --- |
| `executeCommand(start_block)` | execução | mutação | `allocationId`, `referenceDate` | resultado operacional completo | sim |
| `executeCommand(complete_block)` | execução | mutação | `allocationId`, `referenceDate` | resultado operacional completo | sim |
| `executeCommand(mark_block_partial)` | execução | mutação | `allocationId`, `referenceDate` | resultado operacional completo | sim |
| `executeCommand(reschedule_block)` | execução | mutação | `allocationId`, `targetDate?`, `targetSlotId?`, `reason?` | resultado operacional completo | sim |
| `executeCommand(pull_forward_block)` | execução | mutação | `allocationId`, `slotId`, `referenceDate` | resultado operacional completo | sim |
| `executeCommand(auto_replan_day)` | execução | mutação | `referenceDate` | resultado operacional completo | sim |
| `executeCommand(select_next_focus)` | navegação operacional | consulta derivada | `referenceDate` | foco sugerido / ui patch | sim |
| `resolveReview` | revisão assistida | mutação | `allocationId`, `action`, `option?` | resultado operacional completo | sim |
| `openDependency` | dependência | mutação | `allocationId`, `referenceDate` | resultado operacional completo | sim |
| `resolveDependency` | dependência | mutação | `dependencyId`, `referenceDate` | resultado operacional completo | sim |
| `applyDependencyPolicy` | dependência | mutação | `dependencyId`, `action`, `referenceDate` | resultado operacional completo | sim |
| `getTodaySummary` | leitura | consulta | `referenceDate` | `TodayDecisionSummary` | sim |
| `getShortHorizon` | leitura | consulta | `referenceDate`, `days?` | `PlannerShortHorizonSnapshot` | sim |
| `getReviewItems` | leitura | consulta | `referenceDate` | `ReviewItemView[]` | sim |
| `getRescheduleSuggestion` | leitura | consulta | `allocationId`, `referenceDate` | `ReviewOption?` | sim |

## Modelo de Resposta de Mutação
Mutação de domínio não deve retornar apenas `200 OK`.

Ela deve devolver o mesmo tipo de material que hoje o frontend já consome localmente:
- estado derivado atualizado
- consequências
- impacto imediato
- feedback operacional
- patch de UI quando fizer sentido

Shape recomendado:

```json
{
  "ok": true,
  "meta": {
    "requestId": "req-123",
    "issuedAt": "2026-03-22T13:30:00.000Z"
  },
  "data": {
    "nextData": {},
    "uiPatch": {
      "nextDate": "2026-03-23",
      "nextSlotId": "slot-4",
      "nextWorkId": "work-9",
      "openDetailPanel": true
    },
    "consequences": [],
    "impactSummary": {},
    "systemFeedback": {},
    "reviewFlowState": {}
  }
}
```

Observação prática:
- no começo, retornar `nextData` completo é aceitável e compatível com o frontend atual
- mais adiante, isso pode evoluir para diffs ou recursos parciais, mas não é necessário para a primeira implementação real

## Modelo de Resposta de Consulta
Consultas devolvem payload enxuto, separado por recurso:

```json
{
  "ok": true,
  "meta": {
    "requestId": "req-124",
    "issuedAt": "2026-03-22T13:31:00.000Z"
  },
  "data": {
    "summary": {}
  }
}
```

## Modelo de Erro de API
O erro remoto deve ser compatível com o modelo operacional já usado no frontend.

Shape recomendado:

```json
{
  "ok": false,
  "meta": {
    "requestId": "req-125",
    "issuedAt": "2026-03-22T13:32:00.000Z"
  },
  "error": {
    "code": "domain_conflict",
    "message": "A revisão não está mais disponível para este item.",
    "operation": "resolve_review",
    "retryable": true,
    "context": {
      "targetId": "allocation-12",
      "detail": "O bloco já foi remarcado em outra operação."
    }
  }
}
```

### Taxonomia mínima de erro

| Código | Uso | HTTP |
| --- | --- | --- |
| `validation_failed` | payload inválido, campo ausente, enum inválido | `400` |
| `not_found` | bloco, dependência ou revisão não encontrada | `404` |
| `invalid_state` | item existe, mas não pode sofrer a operação agora | `409` |
| `domain_conflict` | conflito de regra operacional ou corrida de estado | `409` |
| `temporarily_unavailable` | indisponibilidade transitória | `503` |
| `internal_error` | falha inesperada do servidor | `500` |

### Retryabilidade
Convenção pragmática:
- `validation_failed`: não retryável
- `not_found`: não retryável
- `invalid_state`: normalmente não retryável
- `domain_conflict`: retryável quando o frontend puder recarregar e reenfileirar
- `temporarily_unavailable`: retryável
- `internal_error`: retryável com parcimônia

## Endpoints Propostos

### 1. Iniciar bloco
- Método: `POST`
- Path: `/api/planner/blocks/{allocationId}/actions/start`
- Idempotência: idempotente na prática se o bloco já estiver em execução

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22",
    "selectedSlotId": "slot-2",
    "selectedWorkId": "proposta-acme"
  }
}
```

Response:
- `200 OK` com `RemotePlannerOperationResult`
- `404` se a alocação não existir
- `409` se a operação não puder ser aplicada

### 2. Concluir bloco
- Método: `POST`
- Path: `/api/planner/blocks/{allocationId}/actions/complete`
- Estratégia de UI: otimista controlada

### 3. Registrar parcial
- Método: `POST`
- Path: `/api/planner/blocks/{allocationId}/actions/partial`
- Estratégia de UI: híbrida
  - feedback local rápido
  - confirmação remota necessária porque pode abrir revisão/remarcação

### 4. Remarcar bloco
- Método: `POST`
- Path: `/api/planner/blocks/{allocationId}/actions/reschedule`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  },
  "targetDate": "2026-03-23",
  "targetSlotId": "slot-8",
  "reason": "Saldo parcial"
}
```

### 5. Puxar bloco futuro
- Método: `POST`
- Path: `/api/planner/blocks/{allocationId}/actions/pull-forward`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  },
  "slotId": "slot-10"
}
```

### 6. Replanejamento automático do dia
- Método: `POST`
- Path: `/api/planner/days/{referenceDate}/actions/auto-replan`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  }
}
```

### 7. Próximo foco
Recomendação:
- não tratar como mutação remota real
- expor como consulta derivada ou embutir no resumo do dia

Opção recomendada:
- Método: `GET`
- Path: `/api/planner/days/{referenceDate}/next-focus`

Resposta:
- foco calculado
- opcionalmente `uiPatch.nextSlotId`

### 8. Abrir dependência
- Método: `POST`
- Path: `/api/planner/dependencies/open`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  },
  "allocationId": "allocation-33"
}
```

### 9. Resolver dependência
- Método: `POST`
- Path: `/api/planner/dependencies/{dependencyId}/resolve`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  }
}
```

### 10. Aplicar política de dependência
- Método: `POST`
- Path: `/api/planner/dependencies/{dependencyId}/policy`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  },
  "action": "liberar_slots_futuros"
}
```

Observação:
- manter como ação explícita de domínio
- não esconder isso em `PATCH /dependencies/{id}` genérico

### 11. Resolver revisão assistida
- Método: `POST`
- Path: `/api/planner/reviews/{allocationId}/resolution`

Request:

```json
{
  "context": {
    "referenceDate": "2026-03-22"
  },
  "action": "accept",
  "option": {
    "id": "allocation-12-2026-03-23-slot-8",
    "date": "2026-03-23",
    "slotId": "slot-8"
  }
}
```

Observação:
- `accept`, `defer` e `ignore` ficam no mesmo endpoint porque representam resolução do mesmo recurso de revisão

### 12. Resumo do dia
- Método: `GET`
- Path: `/api/planner/days/{referenceDate}/summary`
- Cache: curto, com invalidação após mutações

Query params opcionais:
- `selectedSlotId`
- `selectedWorkId`

### 13. Horizonte curto
- Método: `GET`
- Path: `/api/planner/horizon?referenceDate=2026-03-22&days=3`
- Cache: curto

### 14. Itens de revisão
- Método: `GET`
- Path: `/api/planner/reviews?referenceDate=2026-03-22`
- Cache: não por muito tempo; depende de mutações recentes

### 15. Sugestão de remarcação
- Método: `GET`
- Path: `/api/planner/reviews/{allocationId}/suggestion?referenceDate=2026-03-22`

## Mutações vs Consultas

### Mutação
Devem retornar resultado operacional completo:
- iniciar
- concluir
- parcial
- remarcar
- puxar para frente
- auto replanejar
- abrir dependência
- resolver dependência
- aplicar política
- resolver revisão

### Consulta
Devem retornar leitura derivada:
- resumo do dia
- horizonte curto
- itens de revisão
- sugestão de remarcação
- próximo foco

## Estratégia de Integração do Frontend

### Princípio
O frontend mantém:
- `plannerAppPort`
- `plannerLocalAdapter`
- `usePlannerState`

E ganha depois:
- `plannerRemoteAdapter`

O remote adapter deve:
1. montar request DTO HTTP a partir do contrato da porta
2. chamar endpoint real
3. traduzir JSON remoto para `PlannerAppOperationResponse` ou `PlannerAppQueryResponse`
4. deixar o hook intacto

### Estratégia por tipo de operação

| Operação | Estratégia sugerida |
| --- | --- |
| concluir bloco | otimista controlada |
| iniciar bloco | otimista controlada |
| parcial | híbrida |
| abrir dependência | pessimista curta |
| aplicar política de dependência | pessimista curta |
| resolver dependência | pessimista curta |
| resolver revisão | híbrida |
| auto replanejar | pessimista |
| consultas | pessimista simples com cache local leve |

### Justificativa
- ações simples e reversíveis, como iniciar/concluir, toleram atualização otimista
- ações que redistribuem horizonte, revisão ou dependência devem esperar confirmação remota
- o frontend atual já suporta pending, erro e retry leve, então a migração para remoto cabe sem redesenho

## Estratégia de Migração

### Etapa 1
Manter:
- `plannerLocalAdapter` como default

Adicionar:
- `plannerRemoteAdapter`
- `httpClient` mínimo

### Etapa 2
Selecionar adapter por configuração:
- local em desenvolvimento puro
- remoto quando a API estiver disponível

### Etapa 3
Opcionalmente adotar modo híbrido:
- consultas remotas
- mutações locais simuladas apenas em desenvolvimento

## Decisões de Modelagem

### Por que não enviar `PlannerAppStateSnapshot` para o backend?
Porque isso é detalhe do frontend local. O backend real deve receber apenas:
- ids
- datas de referência
- ação pedida
- parâmetros explícitos da decisão

### Por que manter respostas ricas?
Porque o frontend atual já consome:
- consequências
- impacto
- feedback
- patch de UI

Retornar isso do backend reduz retrabalho e evita recalcular metade da semântica no cliente.

### Por que usar ações de domínio em vez de `PATCH` genérico?
Porque operações como:
- resolver revisão
- aplicar política de dependência
- puxar bloco futuro

não são simples alteração de campo. São decisões de domínio com impacto operacional.

## Arquivos Relacionados
- [plannerAppPort.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerAppPort.ts)
- [plannerAppContracts.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerAppContracts.ts)
- [remoteContracts.ts](/home/dns/Desenvolvimento/Planejador/src/application/remoteContracts.ts)
- [plannerLocalAdapter.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerLocalAdapter.ts)

## O que Falta para Começar o Backend Real
- escolher framework backend
- implementar `plannerRemoteAdapter`
- expor endpoints com serialização JSON
- persistir `PlannerData` e estado de revisão/dependência
- definir estratégia de concorrência e versionamento de estado
- adicionar testes de contrato entre adapter remoto e API

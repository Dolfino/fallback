# Documentação consolidada — Planejador Operacional por Blocos

## Visão executiva

O sistema foi concebido como um planejador operacional por blocos de agenda. A ideia central é dividir o dia em slots fixos e permitir que trabalhos maiores sejam fracionados em blocos, distribuídos ao longo do tempo, acompanhados por prazo, risco, dependência, replanejamento e capacidade disponível.

A evolução seguiu uma trilha disciplinada: primeiro a modelagem conceitual, depois a interface navegável, em seguida a explicitação do domínio, revisão assistida, dependências, adapter remoto, backend real mínimo, persistência local e testes de contrato.

O estado atual é de uma base madura para a próxima fase de produto: o frontend opera em modo local e remoto, o backend já responde consultas e mutações reais em memória persistida por snapshot, e a fronteira de integração está protegida por testes de contrato.

## Metadados rápidos

- **Projeto:** Planejador Operacional / Agenda por Blocos
- **Escopo desta documentação:** consolidação de tudo que foi definido e implementado ao longo da trilha de frontend, domínio, adapter remoto, backend e testes
- **Status atual:** frontend e backend remotos mínimos funcionais, com persistência por snapshot e testes de contrato
- **Base temporal:** consolidado a partir desta conversa

## 1. Problema de negócio

O dia de trabalho já era organizado por agendas fixas de aproximadamente 25 minutos. O problema era que trabalhos reais não cabem, em geral, em um único bloco: relatórios, planos estratégicos, revisões e demandas urgentes precisam ser quebrados, redistribuídos, replanejados e acompanhados até a conclusão.

A solução precisava permitir:
- registrar trabalhos individualmente
- estimar duração
- quebrar em múltiplos blocos
- prever término
- lidar com bloqueios por outro setor
- puxar trabalho futuro para slot livre
- medir capacidade
- encerrar o dia com remarcação
- apoiar a decisão de aceitar ou não nova demanda

## 2. Conceitos de domínio consolidados

| Entidade | Função | Observação importante |
|---|---|---|
| Slot | Capacidade fixa do dia | Representa a agenda real, não uma tarefa |
| Trabalho | Demanda principal | Pode gerar múltiplos blocos |
| Bloco | Fatia lógica do trabalho | Nasce da duração estimada |
| Alocação | Encaixe no calendário | Liga bloco a data e slot |
| Dependência | Trava operacional | Pode ter política aplicada |
| Revisão | Decisão assistida | Compara sugerido x aceito |

### Definições

- **Slot:** bloco fixo da agenda, com hora de início, fim, duração, perfil e tipo. É a unidade de capacidade do dia.
- **Trabalho:** demanda principal com duração estimada, prazo, prioridade, contexto, possibilidade de fragmentação e regras como antecipação ou sequência obrigatória.
- **Bloco:** fatia lógica de um trabalho. Um trabalho pode gerar vários blocos, por exemplo 90 minutos equivalem a 4 blocos de 25 minutos.
- **Alocação:** encaixe de um bloco em um slot específico, em uma data específica.
- **Dependência:** trava operacional que impede continuação do trabalho, com motivo, impacto, política aplicada e possível resolução posterior.
- **Revisão assistida:** fluxo que compara opção sugerida versus alternativa aceita, registrando tradeoff, rationale e efeito operacional curto.
- **Horizonte curto:** leitura dos próximos 2 a 3 dias para identificar pressão de carga, slots úteis, risco de prazo e efeito das políticas aplicadas.

## 3. Linha evolutiva do produto

| Fase | Foco | Entrega principal |
|---|---|---|
| 1 a 3 | Concepção + especificação + frontend base | Produto navegável com mocks e páginas centrais |
| 4 a 6 | UX operacional + domínio explícito | Clareza do agora, comandos, consequências e horizonte curto |
| 7 a 9 | Revisão assistida + aplicação uniforme + borda | Fluxos de domínio e adapter local/remoto |
| 10 a 12 | Backend + persistência + testes | API mínima real, snapshot e contrato ponta a ponta |

### Trilha detalhada

1. **Concepção:** definição do problema, fracionamento em blocos, capacidade, prazo, bloqueio, antecipação, urgência, parcial, recorrência, reserva de capacidade e fechamento diário.
2. **Especificação funcional:** entidades, estados, eventos, regras de negócio, telas principais e MVP operacional.
3. **Frontend navegável:** implementação inicial em React + TypeScript + Tailwind, com TodayPage, WeekPage, NewWorkPage, DailyClosingPage, mocks realistas e componentes reutilizáveis.
4. **Refinamento de UX:** fortalecimento de TodayPage, SlotCard, RightDetailPanel e fechamento do dia; foco em clareza do agora, risco e slot livre útil.
5. **Ritmo operacional:** microfeedback das ações, risco perceptível na timeline, prévia de amanhã e atalhos de teclado.
6. **Domínio explícito:** comandos de domínio, consequências tipadas, impacto em cadeia, selectors de horizonte curto e replanejamento assistido.
7. **Revisão assistida como fluxo de domínio:** extração para `plannerReviewFlow`, tradeoff tipado e comparação sugerido versus aceito.
8. **Aplicação uniforme de resultados:** `applyExecution`, `applyReviewResolution`, dependência no mesmo padrão e `plannerOperationApplier`.
9. **Borda de integração:** `plannerAppPort`, `plannerAppContracts`, `plannerLocalAdapter`, `plannerRemoteAdapter`, `remoteClient` e seleção por factory.
10. **Backend real mínimo:** Fastify + TypeScript, rotas centrais, aliases `/api`, store em memória e uso do domínio compartilhado.
11. **Expansão backend:** revisão assistida, dependência, mutações operacionais faltantes, `auto-replan` e `start-block`.
12. **Persistência e testes:** snapshot JSON durável, reset de desenvolvimento, testes de contrato HTTP e do adapter remoto com Vitest.

## 4. Arquitetura do frontend

### Stack e direção visual
- React
- TypeScript
- Tailwind
- centro de controle do dia
- foco desktop-first
- leitura rápida, baixo atrito e decisão operacional

### Páginas principais
- `TodayPage`
- `WeekPage`
- `NewWorkPage`
- `DailyClosingPage`

### Páginas secundárias
- solicitações
- bloqueios
- capacidade
- trabalhos
- detalhe do trabalho

### Componentes centrais
- `AppShell`
- `Sidebar`
- `Topbar`
- `SummaryCard`
- `SlotCard`
- `TimelineDayView`
- `WeekGrid`
- `RightDetailPanel`
- `NewWorkForm`
- `DailyClosingPanel`
- `BlockingList`
- `CapacityPanel`
- `WorkDetailPanel`
- `HorizonPressurePanel`
- `RescheduleReviewPanel`

## 5. Domínio e regras operacionais

### Comandos explícitos
- `startBlock`
- `completeBlock`
- `markBlockPartial`
- `blockAllocation`
- `rescheduleBlock`
- `pullForwardBlock`
- `selectNextFocus`
- `toggleDetailPanel`
- `autoReplanDay`

### Consequências tipadas
- `focus_changed`
- `slot_freed`
- `risk_increased`
- `risk_reduced`
- `pending_created`
- `tomorrow_loaded`
- `block_pulled_forward`
- `dependency_opened`
- `reschedule_suggested`
- `capacity_opened`
- `pressure_detected`
- `completion_progressed`

### Tradeoffs de revisão assistida
- Usa janela ociosa
- Preserva amanhã
- Carrega amanhã
- Empurra pressão
- Mantém foco livre
- Reduz risco imediato

### Políticas de dependência
- `manter_reserva`
- `liberar_slots_futuros`

A segunda política remaneja de verdade alocações futuras no estado.

## 6. Borda de integração

### Porta e contratos
- `plannerAppPort.ts`
- `plannerAppContracts.ts`
- `remoteContracts.ts`

### Adapters
- `plannerLocalAdapter.ts`
- `plannerRemoteAdapter.ts`

### Cliente remoto
- `remoteClient.ts`

### Seleção de adapter
- `createPlannerAppAdapter.ts`

A escolha entre local e remoto é centralizada e configurável por ambiente.

## 7. Backend mínimo real

### Stack
- Node.js
- TypeScript
- Fastify

### Estrutura
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/routes/plannerRoutes.ts`
- `backend/src/state/plannerStore.ts`
- `backend/src/state/plannerPersistence.ts`
- `backend/src/errors/apiError.ts`
- `backend/README.md`

### Endpoints principais
- `GET /planner/day-summary`
- `GET /planner/short-horizon`
- `GET /planner/reviews`
- `GET /planner/reviews/:allocationId/suggestion`
- `POST /planner/operations/complete-block`
- `POST /planner/operations/mark-partial`
- `POST /planner/operations/start-block`
- `POST /planner/operations/reschedule`
- `POST /planner/operations/pull-forward`
- `POST /planner/operations/auto-replan`
- `POST /planner/reviews/resolve`
- `POST /planner/dependencies/open`
- `POST /planner/dependencies/:id/resolve`
- `POST /planner/dependencies/:id/policy`

Também existem aliases compatíveis em `/api/...`.

### Modelo de erro
O backend responde com envelope compatível com o frontend:
- `code`
- `message`
- `operation`
- `retryable`
- `context`

Taxonomia mínima:
- `validation_failed`
- `not_found`
- `invalid_state`
- `domain_conflict`
- `temporarily_unavailable`
- `internal_error`

## 8. Persistência local por snapshot

### Estratégia
- snapshot em `backend/data/planner-state.json`
- load no boot
- fallback para seed limpa
- save após mutações bem-sucedidas
- reset para desenvolvimento

### Arquivos
- `plannerPersistence.ts`
- `plannerStore.ts`
- `resetSnapshot.ts`
- `backend/data/.gitignore`

### Comandos
- `npm run backend:reset`
- `npm run backend:dev`

## 9. Testes de contrato

### Stack
- Vitest

### Estrutura
- `backend/test/http.contract.test.ts`
- `src/application/__tests__/plannerRemoteAdapter.contract.test.ts`
- `backend/test/testUtils.ts`
- `vitest.config.ts`

### Cobertura principal
Consultas:
- day-summary
- short-horizon
- reviews
- suggestion por allocation

Mutações:
- complete-block
- mark-partial
- reviews/resolve
- dependencies/:id/policy
- auto-replan

Erros:
- `validation_failed`
- `not_found`
- `invalid_state`
- `domain_conflict`
- falha de transporte retryable

### Isolamento
Cada teste usa snapshot temporário próprio. O estado real de desenvolvimento não entra na suíte.

### Comando
- `npm run test:contracts`

## 10. Estrutura de arquivos-chave

### Frontend / aplicação
- `src/pages`
- `src/components/layout`
- `src/components/domain`
- `src/hooks/usePlannerState.ts`
- `src/data/selectors.ts`
- `src/types/domain.ts`

### Domínio
- `src/domain/plannerCommands.ts`
- `src/domain/plannerEngine.ts`
- `src/domain/plannerReviewFlow.ts`
- `src/domain/plannerDependencyFlow.ts`
- `src/domain/plannerOperationApplier.ts`
- `src/domain/plannerDerivedState.ts`

### Integração
- `src/application/plannerAppPort.ts`
- `src/application/plannerAppContracts.ts`
- `src/application/remoteContracts.ts`
- `src/application/plannerLocalAdapter.ts`
- `src/application/plannerRemoteAdapter.ts`
- `src/application/remoteClient.ts`
- `src/application/createPlannerAppAdapter.ts`

### Backend
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/routes/plannerRoutes.ts`
- `backend/src/state/plannerStore.ts`
- `backend/src/state/plannerPersistence.ts`
- `backend/src/scripts/resetSnapshot.ts`
- `backend/src/errors/apiError.ts`

### Documentação
- `docs/backend-api-design.md`
- `docs/remote-adapter.md`

## 11. Como rodar o sistema hoje

| Cenário | Comando / observação |
|---|---|
| Reset backend | `npm run backend:reset` |
| Subir backend | `npm run backend:dev` |
| Frontend remoto | `VITE_PLANNER_ADAPTER=remote VITE_PLANNER_API_BASE_URL=http://localhost:3000 npm run dev` |
| Testes de contrato | `npm run test:contracts` |

## 12. Estado atual e próximos passos recomendados

### Estado atual
O produto já possui:
- frontend navegável maduro
- domínio explícito
- revisão assistida
- dependência com política acionável
- adapter remoto
- backend mínimo real
- persistência local por snapshot
- testes de contrato

### Próximos passos recomendados
1. fechar a cobertura dos poucos endpoints remotos restantes, se necessário
2. adicionar regressões de persistência
3. depois entrar em CI leve com:
   - build
   - `tsc`
   - `test:contracts`

### Passos posteriores naturais
- fortalecer persistência se o JSON deixar de atender
- ampliar testes de contrato
- só depois considerar banco real, concorrência mais séria ou infraestrutura adicional

### Resumo executivo de maturidade
Esta base já está pronta para evoluir com segurança. O foco agora deve ser menos invenção e mais confiança incremental, observabilidade e disciplina de integração.

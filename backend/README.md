# Planner Backend

Backend mínimo com store ativa em memória e persistência simples por snapshot JSON, para validar integração real com o `plannerRemoteAdapter`.

## Stack
- Node.js
- TypeScript
- Fastify

## Como rodar

Na raiz do projeto:

```bash
npm install
npm run backend:reset # opcional, para voltar à seed limpa determinística
npm run backend:dev
```

Servidor padrão:
- `http://localhost:3000`

Variáveis opcionais:

```bash
PLANNER_BACKEND_HOST=0.0.0.0
PLANNER_BACKEND_PORT=3000
PLANNER_BACKEND_DATABASE_URL=postgres://user:password@localhost:5432/planejador
```

Modo de persistência:
- sem `PLANNER_BACKEND_DATABASE_URL`: usa snapshot JSON local
- com `PLANNER_BACKEND_DATABASE_URL`: usa PostgreSQL como store persistente principal

Exemplo local com Docker Compose:

```bash
docker compose up -d
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:reset
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:dev
```

## Endpoints desta etapa

Consultas:
- `GET /planner/day-summary`
- `GET /planner/short-horizon`
- `GET /planner/reviews`
- `GET /planner/reviews/:allocationId/suggestion`
- `GET /planner/reviews/suggestion?allocationId=...`

Mutação:
- `POST /planner/works`
- `POST /planner/requests`
- `POST /planner/operations/start-block`
- `POST /planner/operations/complete-block`
- `POST /planner/operations/mark-partial`
- `POST /planner/operations/reschedule`
- `POST /planner/operations/pull-forward`
- `POST /planner/operations/auto-replan`
- `POST /planner/reviews/resolve`
- `POST /planner/dependencies/open`
- `POST /planner/dependencies/:id/resolve`
- `POST /planner/dependencies/:id/policy`

Aliases compatíveis com o frontend remoto atual:
- `POST /api/planner/works`
- `POST /api/planner/requests`
- `GET /api/planner/days/:date/summary`
- `GET /api/planner/horizon`
- `GET /api/planner/reviews`
- `GET /api/planner/reviews/:allocationId/suggestion`
- `POST /api/planner/blocks/:allocationId/actions/start`
- `POST /api/planner/blocks/:allocationId/actions/complete`
- `POST /api/planner/blocks/:allocationId/actions/partial`
- `POST /api/planner/blocks/:allocationId/actions/reschedule`
- `POST /api/planner/blocks/:allocationId/actions/pull-forward`
- `POST /api/planner/days/:date/actions/auto-replan`
- `POST /api/planner/reviews/:allocationId/resolution`
- `POST /api/planner/dependencies/open`
- `POST /api/planner/dependencies/:id/resolve`
- `POST /api/planner/dependencies/:id/policy`

Opcional:
- `GET /health`

## Estado em memória
- o servidor sobe com fixtures locais usando os mesmos mocks do frontend
- a store em memória continua sendo a camada ativa do processo
- no boot, o backend tenta carregar o estado persistido no alvo configurado
- sem `PLANNER_BACKEND_DATABASE_URL`, o alvo padrão é `backend/data/planner-state.json`
- com `PLANNER_BACKEND_DATABASE_URL`, o backend cria/usa a tabela `planner_backend_state`
- se o estado persistido não existir, estiver vazio ou inválido, o backend cai para a seed limpa determinística em `2026-03-23` e registra aviso
- `start-block` coloca uma alocação em execução real no estado atual
- `complete-block` altera esse estado de verdade
- `mark-partial` cria saldo pendente e alimenta a fila de revisão assistida
- `reschedule` move a alocação para outra data/slot de verdade
- `pull-forward` antecipa uma alocação futura para o dia corrente
- `auto-replan` remarca pendências do dia para o próximo dia útil e alimenta revisão quando aplicável
- `POST /planner/works` cria um novo trabalho e seus blocos planejáveis
- `POST /planner/requests` registra nova solicitação na fila de triagem
- revisão assistida altera `ReviewFlowState` em memória
- consultas de revisão e sugestão refletem o estado corrente do processo
- dependências abertas, resolvidas e com política aplicada alteram `PlannerData` em memória
- toda mutação bem-sucedida salva automaticamente o snapshot em disco
- ao reiniciar o processo, o backend restaura o último snapshot salvo

## Persistência local

Arquivo de snapshot:
- `backend/data/planner-state.json`

O snapshot persistido contém:
- `plannerData`
- `reviewFlowState`
- `version`
- `savedAt`

Comportamento:
- leitura no boot
- fallback para seed limpa se o arquivo não existir, estiver vazio ou inválido
- gravação automática após mutações bem-sucedidas
- sem banco, sem transação e sem concorrência avançada nesta etapa

## Persistência em PostgreSQL

Quando `PLANNER_BACKEND_DATABASE_URL` está definido:
- o backend passa a persistir no PostgreSQL
- a tabela `planner_backend_state` é criada automaticamente se não existir
- o backend mantém uma única linha com o snapshot operacional corrente
- `npm run backend:reset` sobrescreve esse estado com a seed determinística

## Reset de desenvolvimento

Para voltar ao estado base:

```bash
npm run backend:reset
```

Esse comando sobrescreve o snapshot persistido com a seed atual do backend.

Na prática:
- a seed de reset é fixa para manter contratos e validações reproduzíveis
- a data operacional base do backend após reset é `2026-03-23`

## Exemplos rápidos

### Consultar itens de revisão assistida

```bash
curl "http://localhost:3000/planner/reviews?referenceDate=2026-03-23"
```

### Consultar sugestão de remarcação

```bash
curl "http://localhost:3000/planner/reviews/aloc-13/suggestion?referenceDate=2026-03-23"
```

### Criar novo trabalho

```bash
curl -X POST http://localhost:3000/planner/works \
  -H 'Content-Type: application/json' \
  -d '{
    "context": { "referenceDate": "2026-03-23" },
    "input": {
      "titulo": "Preparar follow-up executivo",
      "descricao": "Consolidar pendências abertas após a reunião semanal.",
      "etapas": [],
      "duracaoEstimadaMin": 75,
      "prazoData": "2026-03-25",
      "prioridade": "alta",
      "dataInicioMinima": "2026-03-23",
      "fragmentavel": true,
      "blocoMinimoMin": 25,
      "exigeSequencia": true,
      "permiteAntecipacao": true,
      "solicitante": "Diretoria",
      "area": "Operações",
      "clienteProjeto": "Follow-up Executivo",
      "observacoes": ""
    }
  }'
```

Efeito esperado:
- o novo trabalho entra na carteira
- blocos planejáveis são criados no estado remoto
- o frontend pode abrir o detalhe do trabalho recém-criado

### Registrar nova solicitação

```bash
curl -X POST http://localhost:3000/planner/requests \
  -H 'Content-Type: application/json' \
  -d '{
    "context": { "referenceDate": "2026-03-23" },
    "input": {
      "tituloInicial": "Avaliar desvio de SLA",
      "descricaoInicial": "Checar a origem das últimas violações críticas.",
      "solicitante": "CS",
      "area": "Operações",
      "prazoSugerido": "2026-03-24",
      "urgenciaInformada": "alta",
      "esforcoEstimadoInicialMin": 50
    }
  }'
```

Efeito esperado:
- a solicitação entra na fila de triagem
- o snapshot remoto persiste o novo item

### Marcar bloco como parcial

```bash
curl -X POST http://localhost:3000/planner/operations/mark-partial \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-5",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Efeito esperado:
- `aloc-5` muda para `parcial`
- o bloco associado ganha saldo realizado parcial
- a fila de revisão passa a incluir alternativas de remarcação para esse saldo

### Iniciar um bloco

```bash
curl -X POST http://localhost:3000/planner/operations/start-block \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-9",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Efeito esperado:
- `aloc-9` muda para `em_execucao`
- o bloco associado passa a `em_execucao`
- o feedback operacional aponta o slot como iniciado

### Remarcar bloco explicitamente

```bash
curl -X POST http://localhost:3000/planner/operations/reschedule \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-13",
    "targetDate": "2026-03-24",
    "targetSlotId": "slot-6",
    "reason": "Teste remoto",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Efeito esperado:
- `aloc-13` muda de data/slot
- o slot original é liberado
- o horizonte curto e o resumo do próximo dia passam a refletir a nova carga

### Antecipar um bloco futuro

```bash
curl -X POST http://localhost:3000/planner/operations/pull-forward \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-14",
    "slotId": "slot-4",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Efeito esperado:
- `aloc-14` passa para o dia de referência
- o slot alvo fica ocupado pela antecipação
- o horizonte curto perde uma pendência futura e recalcula a próxima janela útil

### Replanejar automaticamente o dia

```bash
curl -X POST http://localhost:3000/planner/operations/auto-replan \
  -H 'Content-Type: application/json' \
  -d '{
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Efeito esperado:
- alocações pendentes do dia são movidas para o próximo dia útil com slots livres
- os blocos movidos ficam marcados como remarcados
- o horizonte curto e a fila de revisão passam a refletir as novas pendências

### Resolver revisão assistida

```bash
curl -X POST http://localhost:3000/planner/reviews/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-3",
    "context": { "referenceDate": "2026-03-23" },
    "action": "defer"
  }'
```

### Abrir dependência

```bash
curl -X POST http://localhost:3000/planner/dependencies/open \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-9",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

### Resolver dependência

```bash
curl -X POST http://localhost:3000/planner/dependencies/dep-aloc-9/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "context": { "referenceDate": "2026-03-23" }
  }'
```

### Aplicar política de dependência

```bash
curl -X POST http://localhost:3000/planner/dependencies/dep-aloc-9/policy \
  -H 'Content-Type: application/json' \
  -d '{
    "context": { "referenceDate": "2026-03-23" },
    "action": "liberar_slots_futuros"
  }'
```

## Como testar com o frontend remoto

Em um terminal:

```bash
npm run backend:dev
```

Em outro:

```bash
VITE_PLANNER_ADAPTER=remote \
VITE_PLANNER_API_BASE_URL=http://localhost:3000 \
npm run dev
```

## Testes de contrato

Para rodar a suíte de contrato:

```bash
npm run test:contracts
```

Para rodar o smoke da UI remota:

```bash
npm run test:ui:smoke
```

Cobertura desta suíte:
- contratos HTTP do backend com `Fastify.inject`
- envelopes de sucesso e erro
- mutações principais com efeito real no estado
- `plannerRemoteAdapter` consumindo um servidor Fastify real de teste via rotas `/api/...`
- regressões de persistência por snapshot: boot com arquivo válido, fallback para seed, snapshot corrompido, escrita após mutação e restart com estado preservado

Cobertura do smoke de UI:
- boot do frontend remoto em Vite
- leitura real do backend por navegador headless
- validação de renderização do DOM principal
- confirmação de chamadas remotas para os endpoints `/api/...`

Isolamento:
- cada teste usa um snapshot temporário próprio
- o arquivo persistido de desenvolvimento não é reutilizado pela suíte
- o adapter remoto sobe o backend em porta efêmera durante o teste

## Como validar a durabilidade

Fluxo simples:

1. rode `npm run backend:reset`
2. suba o backend com `npm run backend:dev`
3. execute uma mutação, por exemplo `start-block` ou `mark-partial`
4. pare o backend
5. suba novamente
6. consulte `GET /planner/day-summary` ou `GET /planner/reviews` e confirme que o estado anterior foi mantido

## Limitações desta etapa
- sem autenticação
- sem concorrência séria
- apenas parte da API exposta
- persistência baseada em snapshot único, seja em arquivo JSON local ou em uma única linha no PostgreSQL
- sem proteção contra escrita concorrente entre múltiplos processos
- sem histórico de versões

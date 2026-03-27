# Guia de Implantação Local e Remota

## Objetivo
Este guia é para quem precisa rodar, resetar, validar e manter o sistema localmente, sem entrar em infraestrutura de produção.

Use este documento para:
- subir frontend em modo local
- subir frontend em modo remoto
- iniciar e resetar o backend
- entender onde o estado fica salvo
- validar rapidamente se a integração está saudável

Para uso funcional do sistema, veja:
- [manual-rapido.md](/home/dns/Desenvolvimento/Planejador/docs/manual-rapido.md)
- [manual-de-uso.md](/home/dns/Desenvolvimento/Planejador/docs/manual-de-uso.md)

## Visão da arquitetura atual

### Frontend
- React + TypeScript + Tailwind
- roda com Vite
- suporta adapter local e adapter remoto

### Backend
- Fastify + TypeScript
- estado ativo em memória
- persistência por snapshot JSON ou PostgreSQL

### Modos de operação
- `local`: frontend usa mocks e estado local
- `remoto`: frontend usa `plannerRemoteAdapter` e conversa com o backend

## Pré-requisitos
- Node.js instalado
- npm disponível

Na raiz do projeto:

```bash
npm install
```

## Estrutura relevante
- frontend principal: [src/](/home/dns/Desenvolvimento/Planejador/src)
- backend: [backend/](/home/dns/Desenvolvimento/Planejador/backend)
- snapshot persistido: [planner-state.json](/home/dns/Desenvolvimento/Planejador/backend/data/planner-state.json)
- adapter remoto: [plannerRemoteAdapter.ts](/home/dns/Desenvolvimento/Planejador/src/application/plannerRemoteAdapter.ts)
- factory de adapter: [createPlannerAppAdapter.ts](/home/dns/Desenvolvimento/Planejador/src/application/createPlannerAppAdapter.ts)

## Scripts principais
Na raiz do projeto:

```bash
npm run dev
npm run build
npm run backend:dev
npm run backend:start
npm run backend:reset
npm run test:contracts
npm run test:ui:smoke
```

## Como rodar em modo local
Esse é o modo mais simples para navegar e testar a interface sem backend.

```bash
npm run dev
```

Resultado:
- frontend disponível no endereço exibido pelo Vite
- dados vindos da seed local do frontend
- nenhuma dependência do backend

## Como rodar em modo remoto
Esse é o modo indicado para validar integração ponta a ponta com o backend real atual.

### Passo 1. Subir o backend
```bash
npm run backend:reset # opcional, para voltar à seed remota base
npm run backend:dev
```

Servidor padrão:
- `http://localhost:3000`

Se quiser usar PostgreSQL:
```bash
PLANNER_BACKEND_DATABASE_URL=postgres://user:password@localhost:5432/planejador \
npm run backend:dev
```

Exemplo pronto com o Compose do projeto:
```bash
docker compose up -d
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:reset
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:dev
```

### Passo 2. Subir o frontend apontando para o backend
```bash
VITE_PLANNER_ADAPTER=remote \
VITE_PLANNER_API_BASE_URL=http://localhost:3000 \
npm run dev
```

Opcional:
```bash
VITE_PLANNER_API_TIMEOUT_MS=10000
```

Resultado:
- frontend passa a usar `plannerRemoteAdapter`
- mutações e consultas passam pelo backend
- o estado remoto persiste entre reinícios via snapshot ou PostgreSQL
- `Novo trabalho` e `Nova solicitação` também persistem no backend

## Como resetar o backend
Para voltar ao estado base:

```bash
npm run backend:reset
```

Esse comando:
- recria o snapshot com a seed remota base do backend
- restaura a data operacional previsível `2026-03-23`
- limpa alterações persistidas de execuções anteriores

Use esse reset antes de:
- demonstrações
- validação manual repetível
- testes exploratórios

## Onde o estado fica salvo
O backend persiste o snapshot em:

- [planner-state.json](/home/dns/Desenvolvimento/Planejador/backend/data/planner-state.json)

Quando `PLANNER_BACKEND_DATABASE_URL` estiver definido, o estado passa a ser persistido no PostgreSQL.

Esse arquivo contém:
- `plannerData`
- `reviewFlowState`
- `version`
- `savedAt`

## Como a persistência funciona
Fluxo atual:
1. o backend sobe
2. tenta carregar o estado persistido no alvo configurado
3. se não existir ou estiver inválido, cai para a seed limpa do backend
4. após mutações bem-sucedidas, grava o novo estado persistido

Isso significa que:
- o estado sobrevive ao reinício do processo
- o backend ainda não usa banco
- não existe concorrência sofisticada entre múltiplos processos
- a base de reset e de fallback é determinística, usando a referência `2026-03-23`

## Variáveis úteis

### Frontend remoto
```bash
VITE_PLANNER_ADAPTER=remote
VITE_PLANNER_API_BASE_URL=http://localhost:3000
VITE_PLANNER_API_TIMEOUT_MS=10000
```

### Backend
```bash
PLANNER_BACKEND_HOST=0.0.0.0
PLANNER_BACKEND_PORT=3000
PLANNER_BACKEND_DATABASE_URL=postgres://user:password@localhost:5432/planejador
```

## Fluxos mínimos para validar instalação

### Validação 1. Frontend local
```bash
npm run dev
```

Verifique:
- a aplicação abre
- a navegação lateral funciona
- `Hoje` carrega a timeline

### Validação 2. Backend saudável
Com backend rodando:

```bash
curl http://localhost:3000/health
```

Resultado esperado:
- resposta HTTP bem-sucedida

### Validação 3. Resumo do dia remoto
```bash
curl "http://localhost:3000/planner/day-summary?referenceDate=2026-03-23"
```

Resultado esperado:
- envelope JSON coerente com os contratos remotos

### Validação 4. Mutação remota real
```bash
curl -X POST http://localhost:3000/planner/operations/start-block \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-9",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Resultado esperado:
- a alocação muda para `em_execucao`
- o snapshot é atualizado

### Validação 5. Persistência após reinício
1. suba o backend
2. execute uma mutação remota
3. pare o backend
4. suba novamente
5. consulte o estado

Exemplo:
```bash
npm run backend:dev
curl -X POST http://localhost:3000/planner/operations/complete-block \
  -H 'Content-Type: application/json' \
  -d '{
    "allocationId": "aloc-9",
    "context": { "referenceDate": "2026-03-23" }
  }'
```

Depois reinicie o backend e consulte:
```bash
curl "http://localhost:3000/planner/day-summary?referenceDate=2026-03-23"
```

## Como saber se o frontend está em local ou remoto

### Na prática
- se você só rodou `npm run dev`, está em `local`
- se subiu backend e iniciou com `VITE_PLANNER_ADAPTER=remote`, está em `remoto`

### Comportamento esperado
- modo local: navegação mais simples, sem depender do backend
- modo remoto: operações persistem no snapshot do backend

## Troubleshooting rápido

### O frontend abre, mas não grava estado entre reinícios
Provável causa:
- você está em modo local

O que fazer:
- suba o backend
- inicie o frontend com `VITE_PLANNER_ADAPTER=remote`

### O frontend remoto não carrega
Verifique:
- se o backend está rodando em `http://localhost:3000`
- se `VITE_PLANNER_API_BASE_URL` está correto
- se não houve timeout ou erro operacional no topo da interface

### Quero voltar para o estado limpo
```bash
npm run backend:reset
```

### O snapshot parece inconsistente
Faça:
1. parar o backend
2. rodar `npm run backend:reset`
3. subir o backend novamente

## Rotina recomendada para desenvolvimento

### Quando estiver mexendo só em UI
Use:
```bash
npm run dev
```

### Quando estiver mexendo em integração
Use:
```bash
npm run backend:dev
VITE_PLANNER_ADAPTER=remote \
VITE_PLANNER_API_BASE_URL=http://localhost:3000 \
npm run dev
```

### Antes de fechar alterações relevantes
Use:
```bash
npm run build
npm run test:contracts
npm run test:ui:smoke
```

## Automação

### CI do repositório
O projeto possui pipeline em GitHub Actions em [ci.yml](/home/dns/Desenvolvimento/Planejador/.github/workflows/ci.yml).

Essa CI executa:
- `npm run build`
- `npm run test:contracts`
- `npm run test:ui:smoke`

O smoke de UI usa um navegador real em modo headless para validar o fluxo remoto da aplicação.

## O que este guia não cobre
- autenticação
- multiusuário
- deploy
- produção
- observabilidade avançada
- infraestrutura de rede

## Documentação relacionada
- manual rápido: [manual-rapido.md](/home/dns/Desenvolvimento/Planejador/docs/manual-rapido.md)
- manual completo: [manual-de-uso.md](/home/dns/Desenvolvimento/Planejador/docs/manual-de-uso.md)
- adapter remoto: [remote-adapter.md](/home/dns/Desenvolvimento/Planejador/docs/remote-adapter.md)
- API desenhada: [backend-api-design.md](/home/dns/Desenvolvimento/Planejador/docs/backend-api-design.md)
- backend: [backend/README.md](/home/dns/Desenvolvimento/Planejador/backend/README.md)

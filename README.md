# Planejador Operacional

Aplicação para organizar trabalho diário por agendas, blocos, prioridades, bloqueios, capacidade e remarcação assistida.

## Stack
- frontend: React + TypeScript + Tailwind + Vite
- backend: Fastify + TypeScript
- persistência remota: snapshot JSON ou PostgreSQL
- persistência local: navegador, quando habilitada nas configurações

## Como começar

### Modo local
```bash
npm install
npm run dev
```

### Modo remoto
```bash
npm install
npm run backend:reset
npm run backend:dev
VITE_PLANNER_ADAPTER=remote \
VITE_PLANNER_API_BASE_URL=http://localhost:3000 \
npm run dev
```

### Modo remoto com PostgreSQL
```bash
docker compose up -d
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:reset
PLANNER_BACKEND_DATABASE_URL=postgres://planejador:planejador@localhost:5433/planejador \
npm run backend:dev
```

## Scripts principais
- `npm run dev`: sobe o frontend com Vite
- `npm run build`: gera build de produção
- `npm run backend:dev`: sobe o backend Fastify
- `npm run backend:reset`: restaura a seed remota determinística `2026-03-23`
- `npm run test:contracts`: roda contratos HTTP, adapter remoto e persistência
- `npm run test:ui:smoke`: valida a UI remota em navegador headless

## Recursos de produto já operacionais
- busca global no topo para trabalhos, clientes/projetos e bloqueios
- configurações reais de tela inicial, data base local e persistência no navegador
- restauração rápida do ambiente local a partir da seed configurada

## Variáveis de ambiente
O arquivo [.env.example](/home/dns/Desenvolvimento/Planejador/.env.example) reúne as variáveis mais úteis para frontend, backend, PostgreSQL e smoke test.

## Automação
A CI do GitHub Actions roda `build`, contratos e smoke de UI em [ci.yml](/home/dns/Desenvolvimento/Planejador/.github/workflows/ci.yml).

## Documentação
- visão geral da documentação: [docs/README.md](/home/dns/Desenvolvimento/Planejador/docs/README.md)
- manual rápido: [docs/manual-rapido.md](/home/dns/Desenvolvimento/Planejador/docs/manual-rapido.md)
- manual completo: [docs/manual-de-uso.md](/home/dns/Desenvolvimento/Planejador/docs/manual-de-uso.md)
- guia local/remoto: [docs/guia-implantacao-local-remota.md](/home/dns/Desenvolvimento/Planejador/docs/guia-implantacao-local-remota.md)
- backend: [backend/README.md](/home/dns/Desenvolvimento/Planejador/backend/README.md)

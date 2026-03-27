# Manual Rápido

## Para que serve
O Planejador Operacional ajuda a organizar o trabalho em agendas, blocos, prioridades, bloqueios e capacidade semanal.

Use este manual quando você só precisa começar a operar o sistema.

Para a versão completa, veja [manual-de-uso.md](/home/dns/Desenvolvimento/Planejador/docs/manual-de-uso.md).
Para instalação e operação local/remota, veja [guia-implantacao-local-remota.md](/home/dns/Desenvolvimento/Planejador/docs/guia-implantacao-local-remota.md).

## Como abrir

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

Observação:
- `npm run backend:reset` restaura a seed remota de desenvolvimento na data operacional `2026-03-23`
- se você não resetar, o backend reutiliza o último snapshot salvo em `backend/data/planner-state.json`

### Validar UI remota automaticamente
```bash
npm run test:ui:smoke
```

Esse smoke test sobe backend e frontend temporários, abre a aplicação em navegador headless e confirma que a UI carregou dados reais do modo remoto.

## Navegação principal
- `Hoje`: centro de controle do dia
- `Semana`: grade semanal por slots
- `Agendas`: visão por agenda/horário
- `Trabalhos`: carteira de trabalhos
- `Solicitações`: fila de entrada
- `Bloqueios`: dependências ativas
- `Capacidade`: leitura de espaço livre
- `Fechamento do Dia`: encerramento operacional

## O que fazer primeiro
1. Abra `Hoje`.
2. Veja `Próximo foco`.
3. Selecione o slot sugerido.
4. Use o painel lateral para agir.

## Ações principais

### Iniciar
Use quando o bloco começou de fato.

### Concluir
Fecha o bloco e atualiza foco, risco e capacidade.

### Parcial
Registra avanço parcial e pode abrir revisão assistida.

### Bloquear
Abre uma dependência para um item que não pode continuar.

### Antecipar
Puxa um bloco futuro para um slot livre.

### Remarcar
Move uma alocação para outra data ou slot.

## Revisão assistida
Quando o sistema precisa da sua decisão para remarcar, ele mostra:
- opção sugerida
- alternativas
- tradeoff curto

Você pode:
- aceitar
- adiar
- ignorar temporariamente

## Onde olhar cada coisa

### Quer saber o que fazer agora?
Vá para `Hoje`.

### Quer enxergar a semana inteira?
Vá para `Semana`.

### Quer ler as agendas por horário?
Vá para `Agendas`.

### Quer acompanhar um trabalho específico?
Vá para `Trabalhos`.

### Quer registrar nova demanda?
Vá para `Solicitações`.

### Quer tratar dependências?
Vá para `Bloqueios`.

### Quer saber se cabe mais trabalho?
Vá para `Capacidade`.

### Quer encerrar o dia e preparar amanhã?
Vá para `Fechamento do Dia`.

## Novo trabalho
Ao criar um trabalho, você pode informar:
- título
- descrição curta
- subtarefas
- duração estimada
- prazo
- prioridade

As subtarefas aparecem no detalhe do trabalho como etapas internas.

## Atalhos de teclado
Nas telas `Hoje`, `Semana`, `Agendas` e `Fechamento do Dia`:

- `J`: próximo slot
- `K`: slot anterior
- `O`: próximo foco
- `D`: abrir/fechar painel lateral

Se houver alocação selecionada:
- `C`: concluir
- `P`: parcial
- `B`: bloquear

## Casos rápidos de uso

### Começar o dia
Abra `Hoje` e siga o `Próximo foco`.

### Fechar um bloco
Selecione o slot e use `Concluir` ou `C`.

### Registrar impedimento
Selecione o slot e use `Bloquear` ou `B`.

### Aproveitar um vazio
Selecione um slot livre em `Hoje` ou `Agendas` e veja as sugestões.

### Ver se cabe um novo trabalho
Abra `Capacidade` e use o simulador rápido.

## Busca e filtros
As páginas principais de lista já têm:
- busca local
- destaque do termo encontrado
- filtros e ordenação quando aplicável

A barra superior agora também faz busca global por:
- trabalho
- cliente/projeto
- bloqueio

Ao selecionar um resultado, o sistema abre o contexto correspondente.

## Quando usar o manual completo
Use o manual completo se você precisar:
- entender revisão assistida em detalhe
- entender dependências e políticas
- treinar outras pessoas
- operar o fechamento do dia com mais rigor
- rodar o sistema em modo remoto

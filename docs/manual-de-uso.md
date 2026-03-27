# Manual de Uso

Este é o manual operacional completo da aplicação.

Se você quiser uma versão curta para adoção rápida, veja [manual-rapido.md](/home/dns/Desenvolvimento/Planejador/docs/manual-rapido.md).
Para instalação e operação local/remota, veja [guia-implantacao-local-remota.md](/home/dns/Desenvolvimento/Planejador/docs/guia-implantacao-local-remota.md).

## Visão geral
O Planejador Operacional organiza o trabalho em blocos distribuídos por agenda, com leitura de risco, revisão assistida, dependências e capacidade da semana.

Hoje a aplicação funciona em dois modos:
- `local`: padrão da interface; usa estado local no frontend
- `remoto`: usa o backend Fastify e persiste o estado em snapshot JSON ou PostgreSQL

## Como abrir

### Modo local
Na raiz do projeto:

```bash
npm install
npm run dev
```

### Modo remoto
Na raiz do projeto:

```bash
npm install
npm run backend:reset
npm run backend:dev
VITE_PLANNER_ADAPTER=remote \
VITE_PLANNER_API_BASE_URL=http://localhost:3000 \
npm run dev
```

Se quiser voltar o backend para a seed base determinística:

```bash
npm run backend:reset
```

Após reset, a data operacional remota volta para `2026-03-23`.

Para validar a UI remota automaticamente:

```bash
npm run test:ui:smoke
```

Esse teste sobe backend e frontend temporários e confirma, em navegador headless, que a interface carregou dados reais do modo remoto.

## Estrutura da interface

### Barra lateral
As páginas principais são:
- `Hoje`
- `Semana`
- `Agendas`
- `Trabalhos`
- `Solicitações`
- `Bloqueios`
- `Capacidade`
- `Fechamento do Dia`
- `Configurações`

### Topo da aplicação
No topo você encontra:
- data operacional atual
- navegação entre dias
- feedback operacional curto
- botões `Nova demanda` e `Novo trabalho`
- atalhos visíveis quando a tela suporta teclado

## Fluxos principais

### 1. Tela Hoje
Use `Hoje` como centro de controle do dia.

Ela mostra:
- `Próximo foco`
- sinais operacionais do dia
- timeline da data selecionada
- painel lateral com leitura operacional do slot selecionado
- impacto em cadeia e pressão do horizonte curto

Use esta tela para:
- iniciar um bloco
- concluir um bloco
- marcar parcial
- bloquear por dependência
- puxar um bloco futuro para um slot livre
- revisar sugestões de remarcação

### 2. Tela Semana
Use `Semana` para enxergar a grade semanal com filtros.

Ela permite:
- filtrar por prioridade
- filtrar por status
- restringir para trabalhos em risco
- selecionar um slot da semana
- abrir o detalhe lateral do item selecionado

### 3. Tela Agendas
Use `Agendas` para ler os trabalhos por janela de agenda.

Recursos disponíveis:
- visão `Dia` e `Semana`
- busca por agenda, trabalho ou projeto
- filtros `Todas`, `Ocupadas`, `Livres`, `Com risco`
- ordenação por `Horário`, `Prioridade` e `Risco primeiro`
- destaque visual do termo buscado

O painel de detalhe da agenda mostra:
- trabalho alocado
- contexto da agenda
- histórico curto
- sugestão para slot livre
- revisão assistida quando existir

### 4. Tela Trabalhos
Use `Trabalhos` para navegar pela carteira de trabalho.

Você pode:
- buscar por título, descrição, projeto ou categoria
- abrir o detalhe completo do trabalho
- ver blocos, progresso, dependências, etapas internas e histórico

### 5. Tela Solicitações
Use `Solicitações` para registrar demandas ainda em triagem.

O formulário permite informar:
- título inicial
- contexto
- solicitante
- área
- prazo sugerido
- esforço estimado

Na fila de entrada, a busca filtra por:
- solicitação
- solicitante
- área

### 6. Tela Bloqueios
Use `Bloqueios` para acompanhar dependências abertas.

Você pode:
- buscar por trabalho, responsável ou política
- ver impacto futuro
- aplicar política de dependência
- resolver dependência

Políticas disponíveis hoje:
- `manter_reserva`
- `liberar_slots_futuros`

### 7. Tela Capacidade
Use `Capacidade` para ler a capacidade livre por dia e simular encaixe.

Ela mostra:
- total, protegida, planejável, ocupada e livre
- leitura diária da capacidade
- simulador rápido de novo trabalho
- busca por dia ou data

### 8. Fechamento do Dia
Use `Fechamento do Dia` para encerrar a operação diária.

Essa tela ajuda a responder:
- o que foi concluído
- o que ficou parcial
- o que ficou bloqueado
- o que precisa voltar para agenda
- como amanhã começa
- quais políticas de dependência já afetaram o horizonte curto

### 9. Novo trabalho
Use `Novo trabalho` para cadastrar um trabalho novo com regras operacionais.

O cadastro aceita:
- título
- descrição curta
- subtarefas com descrição e duração estimada
- duração total
- prazo
- prioridade
- regras de fragmentação e sequência
- solicitante, área e projeto
- observações

As subtarefas entram como etapas internas do trabalho. Elas aparecem no detalhe do trabalho, mas não poluem a timeline principal.

### 10. Detalhe do trabalho
Ao abrir um trabalho, você vê:
- cabeçalho com estado e progresso
- blocos do trabalho
- dependências
- histórico
- etapas internas, quando existirem

## Casos de uso

### Caso 1. Começar o dia e descobrir o que fazer agora
Objetivo:
- identificar o próximo foco em poucos segundos

Passos:
1. Abra `Hoje`.
2. Leia o bloco `Próximo foco`.
3. Confira os sinais operacionais do dia.
4. Se necessário, clique no slot sugerido para abrir o painel lateral.
5. Use `Abrir e iniciar` ou o atalho `O` para ir ao foco recomendado.

Resultado esperado:
- o sistema indica qual trabalho merece atenção imediata
- você entende o horário, o prazo e o estado antes de agir

### Caso 2. Concluir um bloco em andamento
Objetivo:
- registrar avanço real e atualizar o contexto do dia

Passos:
1. Em `Hoje`, `Semana` ou `Agendas`, selecione o slot do bloco.
2. No painel lateral, conclua a execução ou use o atalho `C`.
3. Observe o feedback do topo e o bloco de impacto.

Resultado esperado:
- o bloco muda para concluído
- foco, risco e capacidade são recalculados
- o sistema pode apontar um novo próximo foco

### Caso 3. Registrar execução parcial
Objetivo:
- registrar que o trabalho avançou, mas ainda precisa voltar para agenda

Passos:
1. Selecione a alocação em `Hoje`, `Semana` ou `Agendas`.
2. Marque `Parcial` no painel ou use `P`.
3. Se surgir revisão assistida, compare a opção sugerida com as alternativas.
4. Aceite, adie ou ignore temporariamente.

Resultado esperado:
- o bloco fica parcial
- o saldo pendente entra no fluxo de revisão
- o sistema explica o tradeoff da remarcação sugerida

### Caso 4. Abrir um bloqueio por dependência
Objetivo:
- registrar que o trabalho não pode continuar por causa externa

Passos:
1. Selecione o slot do trabalho bloqueado.
2. Acione `Bloquear` no painel ou use `B`.
3. Vá para `Bloqueios` para ver o item aberto.
4. Aplique uma política quando necessário:
   - `manter_reserva`
   - `liberar_slots_futuros`

Resultado esperado:
- a dependência entra na lista de bloqueios
- o sistema mostra impacto futuro e política sugerida
- o fechamento do dia passa a refletir essa decisão

### Caso 5. Resolver uma dependência
Objetivo:
- devolver um trabalho bloqueado para a operação normal

Passos:
1. Abra `Bloqueios`.
2. Busque o trabalho, responsável ou política, se necessário.
3. Resolva a dependência no item correspondente.

Resultado esperado:
- o bloqueio sai da lista ativa
- o foco pode voltar a ser elegível
- a pressão do horizonte curto é recalculada

### Caso 6. Usar um slot livre para antecipar trabalho
Objetivo:
- aproveitar janela ociosa sem gerar impacto ruim

Passos:
1. Em `Hoje` ou `Agendas`, selecione um slot livre.
2. Veja as sugestões de antecipação no detalhe lateral.
3. Escolha uma sugestão segura e confirme.

Resultado esperado:
- o slot livre é ocupado por um bloco futuro elegível
- o horizonte curto perde pressão futura quando aplicável
- o topo mostra feedback curto da decisão

### Caso 7. Replanejar o dia automaticamente
Objetivo:
- reorganizar pendências do dia com menos atrito manual

Passos:
1. Vá para `Fechamento do Dia`.
2. Revise concluídos, parciais, bloqueados e pendências.
3. Acione o replanejamento automático quando houver itens remarcáveis.
4. Revise as sugestões restantes, se aparecerem.

Resultado esperado:
- pendências do dia são empurradas para o próximo encaixe útil
- amanhã passa a mostrar foco inicial e nova carga
- a fila de revisão é atualizada quando necessário

### Caso 8. Cadastrar um novo trabalho com subtarefas
Objetivo:
- registrar um trabalho grande de forma estruturada e distribuível

Passos:
1. Clique em `Novo trabalho`.
2. Preencha título, descrição e regras operacionais.
3. Adicione subtarefas com:
   - título
   - descrição
   - duração estimada
4. Use a soma das subtarefas para preencher o total estimado, se fizer sentido.
5. Salve o trabalho.

Resultado esperado:
- o trabalho entra na carteira
- as subtarefas aparecem como etapas internas
- os blocos passam a poder ser distribuídos pelo sistema

### Caso 9. Triar uma nova demanda antes de virar trabalho
Objetivo:
- registrar entrada sem comprometer agenda imediatamente

Passos:
1. Clique em `Nova demanda` ou abra `Solicitações`.
2. Preencha os dados mínimos da solicitação.
3. Acompanhe a fila de entrada.

Resultado esperado:
- a demanda entra em triagem
- ela ainda não ocupa agenda fixa
- o time pode decidir depois se vira trabalho

### Caso 10. Ler capacidade antes de aceitar um novo trabalho
Objetivo:
- entender se a semana comporta uma nova carga

Passos:
1. Abra `Capacidade`.
2. Busque o dia desejado, se necessário.
3. Leia a capacidade livre por data.
4. Use o simulador rápido com duração e prazo.

Resultado esperado:
- você entende se o trabalho cabe no horizonte atual
- identifica em que dia a execução pode terminar
- evita aceitar carga sem visibilidade de encaixe

## Operações do dia

### Iniciar bloco
Marca a alocação atual como `em execução`.

### Concluir bloco
Marca a alocação como concluída e recalcula foco, risco e capacidade.

### Marcar parcial
Registra execução parcial e pode abrir revisão assistida para o saldo pendente.

### Bloquear
Abre dependência e coloca o item em bloqueio operacional.

### Remarcar
Move a alocação para outro slot ou outra data.

### Antecipar
Puxa um bloco futuro para um slot livre elegível.

### Replanejar automaticamente
No fechamento ou em contextos operacionais, o sistema pode remanejar pendências do dia para o próximo dia útil.

## Revisão assistida
Quando uma remarcação precisa de validação humana, a interface mostra:
- opção sugerida
- alternativas simples
- tradeoff curto
- aceite, adiamento ou ignorar temporariamente

Exemplos de tradeoff:
- `Preserva amanhã`
- `Carrega amanhã`
- `Usa janela ociosa`
- `Empurra pressão`

## Dependências
Quando um item é bloqueado, o sistema registra uma dependência.

Você pode:
- abrir a dependência
- aplicar política operacional
- resolver a dependência

O efeito aparece em:
- feedback do topo
- contexto local do item bloqueado
- bloqueios
- fechamento do dia

## Busca, filtros e destaque
As principais listas da aplicação usam um padrão comum de controles.

Hoje esse padrão está em:
- `Agendas`
- `Trabalhos`
- `Solicitações`
- `Bloqueios`
- `Capacidade`

O termo buscado é destacado visualmente nos itens e, quando aplicável, no painel de detalhe.

## Atalhos de teclado
Ativos nas telas `Hoje`, `Semana`, `Agendas` e `Fechamento do Dia`, desde que nenhum campo de texto esteja focado:

- `J`: próximo slot
- `K`: slot anterior
- `O`: selecionar próximo foco
- `D`: abrir ou fechar painel lateral

Ativos quando existe uma alocação selecionada:
- `C`: concluir bloco
- `P`: marcar parcial
- `B`: bloquear

## Modo local vs modo remoto

### Modo local
- nasce com mocks no frontend
- não depende do backend
- útil para navegação, layout e iteração rápida

### Modo remoto
- usa o `plannerRemoteAdapter`
- conversa com o backend Fastify
- persiste o estado em `backend/data/planner-state.json`
- mantém estado entre reinícios do servidor

## Limitações atuais
- não há autenticação
- não há multiusuário
- não há banco de dados
- o backend usa snapshot JSON simples
- a busca do topo ainda não substitui as buscas locais das páginas
- o sistema prioriza operação assistida, não scheduling global avançado

## Documentação relacionada
- API desenhada: [backend-api-design.md](/home/dns/Desenvolvimento/Planejador/docs/backend-api-design.md)
- adapter remoto: [remote-adapter.md](/home/dns/Desenvolvimento/Planejador/docs/remote-adapter.md)
- backend: [backend/README.md](/home/dns/Desenvolvimento/Planejador/backend/README.md)

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestServer } from "./testUtils";

describe("backend HTTP contracts", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const setup = await createTestServer();
    app = setup.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns the day summary envelope in the expected shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/planner/day-summary?referenceDate=2026-03-23",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.summary.totalSlots).toBe(16);
    expect(typeof payload.data.summary.capacidadeLivreLabel).toBe("string");
    expect(payload.data.summary.proximoFoco).toBeTruthy();
  });

  it("returns the short horizon envelope in the expected shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/planner/short-horizon?referenceDate=2026-03-23&days=3",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.snapshot.load).toHaveLength(3);
    expect(Array.isArray(payload.data.snapshot.pressurePoints)).toBe(true);
    expect(payload.data.snapshot.tomorrow).toBeTruthy();
  });

  it("returns review items with suggested and alternative options", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/planner/reviews?referenceDate=2026-03-23",
    });
    const payload = response.json();
    const item = payload.data.items.find((entry: { allocationId: string }) => entry.allocationId === "aloc-13");

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(item).toBeTruthy();
    expect(item.suggestedOption).toBeTruthy();
    expect(item.alternatives.length).toBeGreaterThan(0);
    expect(item.suggestedOption.tradeoff).toBeTruthy();
  });

  it("returns a reschedule suggestion for a reviewable allocation", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/planner/reviews/aloc-13/suggestion?referenceDate=2026-03-23",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.suggestion).toBeTruthy();
    expect(payload.data.suggestion.slotId).toBeTruthy();
    expect(payload.data.suggestion.tradeoff).toBeTruthy();
  });

  it("returns the next focus operation envelope through the API alias", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/planner/days/2026-03-23/next-focus",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.uiPatch.nextSlotId).toBeTruthy();
    expect(payload.data.uiPatch.nextWorkId).toBeTruthy();
    expect(payload.data.systemFeedback.title).toBeTruthy();
  });

  it("creates a new work and returns the updated portfolio", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/planner/works",
      payload: {
        context: { referenceDate: "2026-03-23" },
        input: {
          titulo: "Preparar follow-up executivo",
          descricao: "Consolidar pendências abertas após a reunião semanal.",
          etapas: [],
          duracaoEstimadaMin: 75,
          prazoData: "2026-03-25",
          prioridade: "alta",
          dataInicioMinima: "2026-03-23",
          fragmentavel: true,
          blocoMinimoMin: 25,
          exigeSequencia: true,
          permiteAntecipacao: true,
          solicitante: "Diretoria",
          area: "Operações",
          clienteProjeto: "Follow-up Executivo",
          observacoes: "",
        },
      },
    });
    const payload = response.json();
    const created = payload.data.nextData.trabalhos.find((item: { titulo: string }) => item.titulo === "Preparar follow-up executivo");

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(created).toBeTruthy();
    expect(payload.data.nextData.blocos.filter((item: { trabalhoId: string }) => item.trabalhoId === created.id)).toHaveLength(3);
    expect(payload.data.uiPatch.nextWorkId).toBe(created.id);
  });

  it("updates a work deadline, estimate and stage durations through the API alias", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/planner/works/campanhas-marketing-digital",
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          titulo: "Campanhas digitais Q2",
          descricao: "Planejamento revisado das campanhas do próximo ciclo.",
          prazoData: "2026-03-31",
          duracaoEstimadaMin: 300,
          etapas: [
            {
              id: "cronograma",
              titulo: "Cronograma revisado",
              descricao: "Refinar datas, dependências e responsáveis do lançamento.",
              duracaoEstimadaMin: 60,
            },
            {
              id: "brainstorming",
              titulo: "Ideias priorizadas",
              descricao: "Separar hipóteses criativas por canal e prioridade.",
              duracaoEstimadaMin: 60,
            },
            {
              id: "metricas",
              titulo: "Métricas de referência",
              descricao: "Atualizar linha de base de CTR, CAC e conversão.",
              duracaoEstimadaMin: 60,
            },
            {
              id: "execucao",
              titulo: "Plano de execução",
              descricao: "Organizar backlog por canal, verba e janela de envio.",
              duracaoEstimadaMin: 60,
            },
            {
              id: "retro",
              titulo: "Aprendizados do ciclo",
              descricao: "Consolidar decisões para o próximo fechamento semanal.",
              duracaoEstimadaMin: 60,
            },
            {
              id: "ajustes-finais",
              titulo: "Ajustes finais",
              descricao: "Acertar mensagens, orçamento e janela final de lançamento.",
              duracaoEstimadaMin: 0,
            },
          ],
        },
      },
    });
    const payload = response.json();
    const updated = payload.data.nextData.trabalhos.find(
      (item: { id: string }) => item.id === "campanhas-marketing-digital",
    );

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(updated.titulo).toBe("Campanhas digitais Q2");
    expect(updated.descricao).toBe("Planejamento revisado das campanhas do próximo ciclo.");
    expect(updated.prazoData).toBe("2026-03-31");
    expect(updated.duracaoEstimadaMin).toBe(300);
    expect(updated.etapas[0].duracaoEstimadaMin).toBe(60);
    expect(updated.etapas).toHaveLength(6);
    expect(
      payload.data.nextData.blocos.filter((item: { trabalhoId: string }) => item.trabalhoId === "campanhas-marketing-digital"),
    ).toHaveLength(12);
    expect(payload.data.systemFeedback.title).toBe("Trabalho atualizado");
  });

  it("reduces future planned blocks when the estimated total shrinks", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/planner/works/campanhas-marketing-digital",
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          titulo: "Campanhas de marketing digital",
          descricao: "Planejamento das próximas campanhas digitais, incluindo cronograma, ideação, análise histórica, definição de público-alvo e KPIs.",
          prazoData: "2026-03-27",
          duracaoEstimadaMin: 150,
          etapas: [
            {
              id: "cronograma",
              titulo: "Planejamento de Cronograma",
              descricao: "Estabelecer um cronograma para a implementação das novas campanhas, incluindo prazos e responsáveis.",
              duracaoEstimadaMin: 25,
            },
            {
              id: "brainstorming",
              titulo: "Brainstorming de Novas Ideias",
              descricao: "Gerar propostas criativas para futuras campanhas com base nas tendências do mercado.",
              duracaoEstimadaMin: 25,
            },
            {
              id: "metricas",
              titulo: "Análise de Resultados",
              descricao: "Revisar métricas das últimas campanhas para identificar pontos fortes e áreas de melhoria.",
              duracaoEstimadaMin: 25,
            },
            {
              id: "execucao",
              titulo: "Planejamento de Execução",
              descricao: "Estruturar canais, verba e materiais prioritários para o próximo ciclo.",
              duracaoEstimadaMin: 25,
            },
            {
              id: "retro",
              titulo: "Fechamento do Aprendizado",
              descricao: "Consolidar aprendizados para orientar a rodada seguinte.",
              duracaoEstimadaMin: 25,
            },
          ],
        },
      },
    });
    const payload = response.json();
    const updated = payload.data.nextData.trabalhos.find(
      (item: { id: string }) => item.id === "campanhas-marketing-digital",
    );
    const workBlocks = payload.data.nextData.blocos.filter(
      (item: { trabalhoId: string }) => item.trabalhoId === "campanhas-marketing-digital",
    );

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(updated.duracaoEstimadaMin).toBe(150);
    expect(workBlocks).toHaveLength(6);
    expect(workBlocks[0].status).toBe("planejado");
  });

  it("rejects work updates when stage minutes exceed the estimated total", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/planner/works/campanhas-marketing-digital",
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          titulo: "Campanhas digitais Q2",
          descricao: "Planejamento revisado das campanhas do próximo ciclo.",
          prazoData: "2026-03-31",
          duracaoEstimadaMin: 100,
          etapas: [
            {
              id: "cronograma",
              titulo: "Cronograma revisado",
              descricao: "Primeira etapa",
              duracaoEstimadaMin: 60,
            },
            {
              id: "brainstorming",
              titulo: "Ideias priorizadas",
              descricao: "Segunda etapa",
              duracaoEstimadaMin: 60,
            },
          ],
        },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("validation_failed");
    expect(payload.error.context.field).toBe("input.etapas");
  });

  it("creates a new request and returns the updated intake queue", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/planner/requests",
      payload: {
        context: { referenceDate: "2026-03-23" },
        input: {
          tituloInicial: "Avaliar desvio de SLA",
          descricaoInicial: "Checar a origem das últimas violações críticas.",
          solicitante: "CS",
          area: "Operações",
          prazoSugerido: "2026-03-24",
          urgenciaInformada: "alta",
          esforcoEstimadoInicialMin: 50,
        },
      },
    });
    const payload = response.json();
    const created = payload.data.nextData.solicitacoes.find((item: { tituloInicial: string }) => item.tituloInicial === "Avaliar desvio de SLA");

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(created).toBeTruthy();
    expect(created.statusTriagem).toBe("nova");
    expect(payload.data.systemFeedback.title).toBe("Solicitação registrada");
  });

  it("creates a new issue linked to a work stage and active block context", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/planner/issues",
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          trabalhoId: "campanhas-marketing-digital",
          etapaId: "cronograma",
          blocoId: "bloco-campanhas-marketing-digital-1",
          alocacaoId: "aloc-25",
          tipo: "problema",
          titulo: "Dependência externa para validar calendário",
          descricao: "Marketing ainda não confirmou a janela final de disparo.",
        },
      },
    });
    const payload = response.json();
    const created = payload.data.nextData.issues.find(
      (item: { titulo: string }) => item.titulo === "Dependência externa para validar calendário",
    );

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(created).toBeTruthy();
    expect(created.etapaId).toBe("cronograma");
    expect(created.blocoId).toBe("bloco-campanhas-marketing-digital-1");
    expect(created.alocacaoId).toBe("aloc-25");
    expect(payload.data.systemFeedback.title).toBe("Problema registrado");
  });

  it("updates an existing issue and keeps the stage linkage coherent", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/planner/issues",
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          trabalhoId: "campanhas-marketing-digital",
          etapaId: "cronograma",
          blocoId: "bloco-campanhas-marketing-digital-1",
          alocacaoId: "aloc-25",
          tipo: "tarefa",
          titulo: "Consolidar datas do cronograma",
          descricao: "Versão inicial da issue.",
        },
      },
    });
    const createdPayload = create.json();
    const created = createdPayload.data.nextData.issues.find(
      (item: { titulo: string }) => item.titulo === "Consolidar datas do cronograma",
    );

    const update = await app.inject({
      method: "PATCH",
      url: `/api/planner/issues/${created.id}`,
      payload: {
        context: { referenceDate: "2026-03-24" },
        input: {
          etapaId: "brainstorming",
          tipo: "problema",
          titulo: "Dependência de aprovação criativa",
          descricao: "A issue mudou de escopo durante a execução.",
        },
      },
    });
    const updatePayload = update.json();
    const updated = updatePayload.data.nextData.issues.find(
      (item: { id: string }) => item.id === created.id,
    );

    expect(update.statusCode).toBe(200);
    expect(updated.titulo).toBe("Dependência de aprovação criativa");
    expect(updated.etapaId).toBe("brainstorming");
    expect(updated.tipo).toBe("problema");
    expect(updatePayload.data.systemFeedback.title).toBe("Issue atualizada");
  });

  it("completes a block and changes the subsequent day summary", async () => {
    const before = await app.inject({
      method: "GET",
      url: "/planner/day-summary?referenceDate=2026-03-23",
    });
    const beforePayload = before.json();

    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/complete-block",
      payload: {
        allocationId: "aloc-9",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const mutatePayload = mutate.json();

    const after = await app.inject({
      method: "GET",
      url: "/planner/day-summary?referenceDate=2026-03-23",
    });
    const afterPayload = after.json();

    expect(mutate.statusCode).toBe(200);
    expect(mutatePayload.data.nextData.alocacoes.find((item: { id: string }) => item.id === "aloc-9").statusAlocacao).toBe("concluido");
    expect(afterPayload.data.summary.concluidos).toBeGreaterThan(beforePayload.data.summary.concluidos);
  });

  it("marks a block as partial and exposes it through review items", async () => {
    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/mark-partial",
      payload: {
        allocationId: "aloc-5",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const mutatePayload = mutate.json();

    const reviews = await app.inject({
      method: "GET",
      url: "/planner/reviews?referenceDate=2026-03-23",
    });
    const reviewsPayload = reviews.json();
    const item = reviewsPayload.data.items.find((entry: { allocationId: string }) => entry.allocationId === "aloc-5");

    expect(mutate.statusCode).toBe(200);
    expect(mutatePayload.data.nextData.alocacoes.find((entry: { id: string }) => entry.id === "aloc-5").statusAlocacao).toBe("parcial");
    expect(item).toBeTruthy();
    expect(item.status).toBe("parcial");
    expect(item.reviewStatus).toBe("pending");
  });

  it("resolves assisted review and persists the new review status", async () => {
    const mutate = await app.inject({
      method: "POST",
      url: "/planner/reviews/resolve",
      payload: {
        allocationId: "aloc-13",
        action: "defer",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const reviews = await app.inject({
      method: "GET",
      url: "/planner/reviews?referenceDate=2026-03-23",
    });
    const reviewsPayload = reviews.json();
    const item = reviewsPayload.data.items.find((entry: { allocationId: string }) => entry.allocationId === "aloc-13");

    expect(mutate.statusCode).toBe(200);
    expect(item.reviewStatus).toBe("deferred");
  });

  it("applies dependency policy and returns a coherent operation envelope", async () => {
    const open = await app.inject({
      method: "POST",
      url: "/planner/dependencies/open",
      payload: {
        allocationId: "aloc-9",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const openPayload = open.json();
    const dependencyId = openPayload.data.nextData.dependencias.find(
      (entry: { blocoId: string }) => entry.blocoId === "bloco-comite-operacoes-1",
    )?.id;

    const before = await app.inject({
      method: "GET",
      url: "/planner/short-horizon?referenceDate=2026-03-23",
    });
    const beforePayload = before.json();

    const policy = await app.inject({
      method: "POST",
      url: `/planner/dependencies/${dependencyId}/policy`,
      payload: {
        action: "liberar_slots_futuros",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const policyPayload = policy.json();

    const after = await app.inject({
      method: "GET",
      url: "/planner/short-horizon?referenceDate=2026-03-23",
    });
    const afterPayload = after.json();

    expect(policy.statusCode).toBe(200);
    expect(policyPayload.ok).toBe(true);
    expect(policyPayload.data.consequences.length).toBeGreaterThan(0);
    expect(policyPayload.data.systemFeedback.title).toBeTruthy();
    expect(
      JSON.stringify(afterPayload.data.snapshot.load[1]),
    ).not.toBe(JSON.stringify(beforePayload.data.snapshot.load[1]));
  });

  it("auto-replans the day and moves pending allocations to the next day", async () => {
    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/auto-replan",
      payload: {
        context: { referenceDate: "2026-03-23" },
      },
    });
    const payload = mutate.json();
    const moved = payload.data.nextData.alocacoes.find((entry: { id: string }) => entry.id === "aloc-3");

    expect(mutate.statusCode).toBe(200);
    expect(moved.dataPlanejada).toBe("2026-03-24");
    expect(moved.statusAlocacao).toBe("remarcado");
    expect(payload.data.impactSummary.headline).toContain("Pendências");
  });

  it("auto-replans the carryover from the previous week into the new horizon", async () => {
    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/auto-replan-week",
      payload: {
        context: { referenceDate: "2026-03-30" },
      },
    });
    const payload = mutate.json();
    const moved = payload.data.nextData.alocacoes.find((entry: { id: string }) => entry.id === "aloc-3");
    const blocked = payload.data.nextData.alocacoes.find((entry: { id: string }) => entry.id === "aloc-4");

    expect(mutate.statusCode).toBe(200);
    expect(moved.dataPlanejada).toBe("2026-03-30");
    expect(moved.slotId).toBe("slot-1");
    expect(moved.statusAlocacao).toBe("remarcado");
    expect(blocked.dataPlanejada).toBe("2026-03-23");
    expect(blocked.statusAlocacao).toBe("bloqueado");
    expect(payload.data.impactSummary.headline).toContain("nova semana");
  });

  it("confirms the day closing and persists a fechamento record", async () => {
    const mutate = await app.inject({
      method: "POST",
      url: "/planner/operations/confirm-close",
      payload: {
        context: { referenceDate: "2026-03-23" },
      },
    });
    const payload = mutate.json();
    const closing = payload.data.nextData.fechamentosOperacionais.find(
      (entry: { date: string }) => entry.date === "2026-03-23",
    );

    expect(mutate.statusCode).toBe(200);
    expect(closing).toBeTruthy();
    expect(closing.pendingCount).toBeGreaterThan(0);
    expect(payload.data.impactSummary.headline).toContain("Fechamento");
  });

  it("returns validation_failed for invalid payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/planner/operations/complete-block",
      payload: {},
    });
    const payload = response.json();

    expect(response.statusCode).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("validation_failed");
  });

  it("returns validation_failed for a referenceDate outside the operational week", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/planner/operations/start-block",
      payload: {
        allocationId: "aloc-11",
        context: { referenceDate: "2099-01-01" },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("validation_failed");
    expect(payload.error.context.field).toBe("referenceDate");
  });

  it("returns not_found for missing dependencies", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/planner/dependencies/missing-id/resolve",
      payload: {
        context: { referenceDate: "2026-03-23" },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("not_found");
  });

  it("returns invalid_state when resolving review for a non-reviewable allocation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/planner/reviews/resolve",
      payload: {
        allocationId: "aloc-1",
        action: "accept",
        context: { referenceDate: "2026-03-23" },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("invalid_state");
  });

  it("returns domain_conflict when a review option is no longer valid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/planner/reviews/resolve",
      payload: {
        allocationId: "aloc-13",
        action: "accept",
        option: {
          id: "fake-option",
          date: "2026-03-24",
          slotId: "slot-99",
        },
        context: { referenceDate: "2026-03-23" },
      },
    });
    const payload = response.json();

    expect(response.statusCode).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("domain_conflict");
  });
});

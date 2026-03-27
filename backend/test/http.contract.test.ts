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

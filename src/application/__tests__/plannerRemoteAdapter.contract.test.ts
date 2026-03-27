import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createPlannerRemoteAdapter } from "../plannerRemoteAdapter";
import {
  createStateSnapshot,
  createTestServer,
  loadTestSnapshot,
  startTestServer,
} from "../../../backend/test/testUtils";

function createRequestMeta() {
  return {
    requestId: `test-${Math.random().toString(36).slice(2)}`,
    issuedAt: new Date().toISOString(),
  };
}

describe("plannerRemoteAdapter contract", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let snapshotFilePath: string;

  beforeEach(async () => {
    const setup = await createTestServer();
    app = setup.app;
    snapshotFilePath = setup.snapshotFilePath;
    baseUrl = await startTestServer(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it("reads day summary through the remote adapter using the real API alias", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.getTodaySummary({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.totalSlots).toBe(16);
      expect(response.data.proximoFoco).toBeTruthy();
    }
  });

  it("reads review items and reschedule suggestion through the remote adapter aliases", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);
    const state = createStateSnapshot(snapshot);

    const reviews = await adapter.getReviewItems({
      meta: createRequestMeta(),
      state,
    });
    const suggestion = await adapter.getRescheduleSuggestion({
      meta: createRequestMeta(),
      state,
      allocationId: "aloc-13",
    });

    expect(reviews.ok).toBe(true);
    expect(suggestion.ok).toBe(true);

    if (reviews.ok) {
      expect(reviews.data.some((item) => item.allocationId === "aloc-13")).toBe(true);
    }

    if (suggestion.ok) {
      expect(suggestion.data?.slotId).toBeTruthy();
      expect(suggestion.data?.tradeoff).toBeTruthy();
    }
  });

  it("executes complete_block through the remote adapter and translates the operation result", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      command: "complete_block",
      payload: {
        allocationId: "aloc-9",
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.alocacoes.find((entry) => entry.id === "aloc-9")?.statusAlocacao,
      ).toBe("concluido");
      expect(response.application.systemFeedback.title).toBeTruthy();
    }
  });

  it("executes start_block through the remote adapter alias and updates execution state", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      command: "start_block",
      payload: {
        allocationId: "aloc-11",
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.alocacoes.find((entry) => entry.id === "aloc-11")?.statusAlocacao,
      ).toBe("em_execucao");
      expect(response.application.slotFeedback?.label).toBe("Em execução");
    }
  });

  it("executes auto_replan_day through the remote adapter alias and returns remarcado items", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      command: "auto_replan_day",
      payload: {},
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.alocacoes.find((entry) => entry.id === "aloc-3")?.statusAlocacao,
      ).toBe("remarcado");
      expect(response.application.impactSummary.headline).toContain("Pendências");
    }
  });

  it("executes select_next_focus through the remote adapter alias", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      command: "select_next_focus",
      payload: {},
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.application.nextSlotId).toBeTruthy();
      expect(response.application.nextWorkId).toBeTruthy();
      expect(response.application.systemFeedback.title).toBeTruthy();
    }
  });

  it("creates a work through the remote adapter and returns the new work id", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.createWork({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      input: {
        titulo: "Fechar pauta do comitê",
        descricao: "Revisar decisões pendentes e distribuir próximos passos.",
        etapas: [],
        duracaoEstimadaMin: 50,
        prazoData: "2026-03-25",
        prioridade: "media",
        dataInicioMinima: "2026-03-23",
        fragmentavel: true,
        blocoMinimoMin: 25,
        exigeSequencia: false,
        permiteAntecipacao: true,
        solicitante: "Governança",
        area: "Operações",
        clienteProjeto: "Comitê",
        observacoes: "",
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.application.nextWorkId).toBeTruthy();
      expect(
        response.application.nextData?.trabalhos.some((entry) => entry.titulo === "Fechar pauta do comitê"),
      ).toBe(true);
    }
  });

  it("creates a request through the remote adapter and returns the updated queue", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.createRequest({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      input: {
        tituloInicial: "Levantar falhas recorrentes",
        descricaoInicial: "Mapear as causas mais frequentes do fluxo operacional.",
        solicitante: "Qualidade",
        area: "Operações",
        prazoSugerido: "2026-03-24",
        urgenciaInformada: "media",
        esforcoEstimadoInicialMin: 60,
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.solicitacoes.some((entry) => entry.tituloInicial === "Levantar falhas recorrentes"),
      ).toBe(true);
      expect(response.application.systemFeedback.title).toBe("Solicitação registrada");
    }
  });

  it("maps backend validation errors into the adapter failure shape", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.resolveReview({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      allocationId: "aloc-13",
      action: "accept",
      option: {
        id: "fake-option",
        date: "2026-03-24",
        slotId: "slot-99",
        slotLabel: "Fake",
        pressureLevel: "watch",
        decisionRationale: "Fake",
        impactSummary: "Fake",
        tradeoff: {
          code: "increase_tomorrow_load",
          label: "Fake",
          effect: "Fake",
          tone: "warning",
        },
        isSuggested: false,
      },
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("domain_conflict");
      expect(response.error.operation).toBe("resolve_review");
      expect(response.error.retryable).toBe(false);
    }
  });

  it("maps transport failures as retryable errors", async () => {
    const adapter = createPlannerRemoteAdapter({
      baseUrl: "http://127.0.0.1:1",
      timeoutMs: 200,
    });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.getTodaySummary({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("temporarily_unavailable");
      expect(response.error.retryable).toBe(true);
      expect(response.error.operation).toBe("get_today_summary");
    }
  });
});

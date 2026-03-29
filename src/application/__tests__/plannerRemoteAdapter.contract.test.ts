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

  it("loads the persisted remote snapshot through the adapter", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.loadRemoteSnapshot({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.plannerData.diasSemana.length).toBeGreaterThanOrEqual(10);
      expect(response.data.reviewFlowState.activeAllocationIds).toBeDefined();
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

  it("executes auto_replan_week through the remote adapter alias and brings carryover into the new week", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot, {
        selectedDate: "2026-03-30",
      }),
      command: "auto_replan_week",
      payload: {},
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.alocacoes.find((entry) => entry.id === "aloc-3")?.dataPlanejada,
      ).toBe("2026-03-30");
      expect(
        response.application.nextData?.alocacoes.find((entry) => entry.id === "aloc-4")?.statusAlocacao,
      ).toBe("bloqueado");
      expect(response.application.impactSummary.headline).toContain("nova semana");
    }
  });

  it("executes confirm_day_closing through the remote adapter alias", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.executeCommand({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot),
      command: "confirm_day_closing",
      payload: {},
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.fechamentosOperacionais?.some((entry) => entry.date === "2026-03-23"),
      ).toBe(true);
      expect(response.application.impactSummary.headline).toContain("Fechamento");
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

  it("updates a work through the remote adapter and adds blocks when the estimate grows", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.updateWork({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot, {
        selectedDate: "2026-03-24",
        selectedWorkId: "campanhas-marketing-digital",
        selectedSlotId: "slot-1",
      }),
      workId: "campanhas-marketing-digital",
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
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      const work = response.application.nextData?.trabalhos.find(
        (entry) => entry.id === "campanhas-marketing-digital",
      );
      const blocks =
        response.application.nextData?.blocos.filter(
          (entry) => entry.trabalhoId === "campanhas-marketing-digital",
        ) ?? [];

      expect(work?.prazoData).toBe("2026-03-31");
      expect(work?.duracaoEstimadaMin).toBe(300);
      expect(work?.etapas).toHaveLength(6);
      expect(blocks).toHaveLength(12);
      expect(response.application.systemFeedback.title).toBe("Trabalho atualizado");
    }
  });

  it("updates a work through the remote adapter and removes future planned blocks when the estimate shrinks", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.updateWork({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot, {
        selectedDate: "2026-03-24",
        selectedWorkId: "campanhas-marketing-digital",
        selectedSlotId: "slot-1",
      }),
      workId: "campanhas-marketing-digital",
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
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      const blocks =
        response.application.nextData?.blocos.filter(
          (entry) => entry.trabalhoId === "campanhas-marketing-digital",
        ) ?? [];
      const work = response.application.nextData?.trabalhos.find(
        (entry) => entry.id === "campanhas-marketing-digital",
      );

      expect(work?.duracaoEstimadaMin).toBe(150);
      expect(blocks).toHaveLength(6);
      expect(response.application.systemFeedback.detail).toContain("bloco");
    }
  });

  it("creates an issue through the remote adapter and keeps the work-stage linkage", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const response = await adapter.createIssue({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot, {
        selectedDate: "2026-03-24",
        selectedWorkId: "campanhas-marketing-digital",
        selectedSlotId: "slot-1",
      }),
      input: {
        trabalhoId: "campanhas-marketing-digital",
        etapaId: "cronograma",
        blocoId: "bloco-campanhas-marketing-digital-1",
        alocacaoId: "aloc-25",
        tipo: "tarefa",
        titulo: "Consolidar datas aprovadas",
        descricao: "Confirmar no plano a janela final validada pelo marketing.",
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.issues.some(
          (entry) =>
            entry.titulo === "Consolidar datas aprovadas" &&
            entry.etapaId === "cronograma" &&
            entry.blocoId === "bloco-campanhas-marketing-digital-1",
        ),
      ).toBe(true);
      expect(response.application.systemFeedback.title).toBe("Tarefa registrada");
    }
  });

  it("updates an issue through the remote adapter", async () => {
    const adapter = createPlannerRemoteAdapter({ baseUrl });
    const snapshot = loadTestSnapshot(snapshotFilePath);

    const created = await adapter.createIssue({
      meta: createRequestMeta(),
      state: createStateSnapshot(snapshot, {
        selectedDate: "2026-03-24",
        selectedWorkId: "campanhas-marketing-digital",
        selectedSlotId: "slot-1",
      }),
      input: {
        trabalhoId: "campanhas-marketing-digital",
        etapaId: "cronograma",
        blocoId: "bloco-campanhas-marketing-digital-1",
        alocacaoId: "aloc-25",
        tipo: "tarefa",
        titulo: "Ajustar sequência do cronograma",
        descricao: "Issue inicial.",
      },
    });

    expect(created.ok).toBe(true);
    if (!created.ok || !created.application.nextData) {
      return;
    }

    const issue = created.application.nextData.issues.find(
      (entry) => entry.titulo === "Ajustar sequência do cronograma",
    );

    const response = await adapter.updateIssue({
      meta: createRequestMeta(),
      state: createStateSnapshot({
        plannerData: created.application.nextData,
        reviewFlowState: snapshot.reviewFlowState,
      }, {
        selectedDate: "2026-03-24",
        selectedWorkId: "campanhas-marketing-digital",
        selectedSlotId: "slot-1",
      }),
      issueId: issue!.id,
      input: {
        etapaId: "brainstorming",
        tipo: "problema",
        titulo: "Dependência criativa ainda aberta",
        descricao: "Issue revisada no detalhe do trabalho.",
      },
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(
        response.application.nextData?.issues.some(
          (entry) =>
            entry.id === issue!.id &&
            entry.titulo === "Dependência criativa ainda aberta" &&
            entry.etapaId === "brainstorming" &&
            entry.tipo === "problema",
        ),
      ).toBe(true);
      expect(response.application.systemFeedback.title).toBe("Issue atualizada");
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

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPlannerAppAdapter } from "../application/createPlannerAppAdapter";
import type { PlannerAppPort, PlannerAppStateSnapshot } from "../application/plannerAppPort";
import type {
  PlannerAppOperationError,
  PlannerAppOperationKind,
  PlannerAppOperationResponse,
  PlannerAppRequestMeta,
  PlannerShortHorizonSnapshot,
} from "../application/plannerAppContracts";
import {
  clearPlannerLocalSnapshot,
  createLocalControllerSeed,
  loadPlannerLocalSnapshot,
  loadPlannerPreferences,
  resetPlannerPreferences as resetStoredPlannerPreferences,
  savePlannerLocalSnapshot,
  savePlannerPreferences,
} from "../application/plannerBrowserStorage";
import {
  getShortHorizonLoad,
  getTimelineForDate,
  getTodayDecisionSummary,
  getTomorrowPreview,
  getUpcomingPressurePoints,
} from "../data/selectors";
import { applyPlannerDerivedState, clampPlannerDate } from "../domain/plannerDerivedState";
import {
  applyPlannerOperationState,
  type PlannerOperationApplication,
} from "../domain/plannerOperationApplier";
import {
  buildReviewItems,
  createEmptyReviewState,
} from "../domain/plannerReviewFlow";
import { searchPlannerData, type PlannerGlobalSearchResult } from "../domain/plannerSearch";
import type {
  DependencyPolicyAction,
  ImmediateImpactSummary,
  PlannerCommandPayloadMap,
  PlannerConsequence,
  PlannerRequestInput,
  PlannerWorkInput,
  ReviewFlowState,
  ReviewItemView,
  ReviewOption,
  SlotFeedback,
  SystemFeedback,
} from "../types/domain";
import type { AppView, PlannerUserPreferences, WeekFilters } from "../types/ui";
import { addDays } from "../utils/date";

function isInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function createRequestMeta(): PlannerAppRequestMeta {
  return {
    requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    issuedAt: new Date().toISOString(),
  };
}

export function usePlannerState(adapter?: PlannerAppPort) {
  const plannerApp = useMemo(() => adapter ?? createPlannerAppAdapter(), [adapter]);
  const isRemoteMode = plannerApp.mode === "remote";
  const [preferences, setPreferences] = useState<PlannerUserPreferences>(() =>
    loadPlannerPreferences(),
  );
  const initialControllerState = useMemo(() => {
    if (!isRemoteMode && preferences.persistLocalState) {
      return loadPlannerLocalSnapshot() ?? createLocalControllerSeed(preferences);
    }

    return createLocalControllerSeed(preferences);
  }, [isRemoteMode, preferences]);

  const [plannerData, setPlannerData] = useState(initialControllerState.plannerData);
  const [activeView, setActiveView] = useState<AppView>(initialControllerState.activeView);
  const [selectedDate, setSelectedDate] = useState(initialControllerState.selectedDate);
  const [selectedSlotId, setSelectedSlotId] = useState(initialControllerState.selectedSlotId);
  const [selectedWorkId, setSelectedWorkId] = useState(initialControllerState.selectedWorkId);
  const [weekFilters, setWeekFilters] = useState<WeekFilters>({
    prioridade: "todas",
    status: "todos",
    apenasRisco: false,
  });
  const [systemFeedback, setSystemFeedback] = useState<SystemFeedback>({
    title: "Operação ativa",
    detail: "Agenda 04 ficou livre. Há blocos elegíveis para antecipação sem impacto negativo na sequência do dia.",
    tone: "opportunity",
    contextTag: {
      label: "Usa janela ociosa",
      tone: "opportunity",
    },
  });
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(
    initialControllerState.isDetailPanelOpen,
  );
  const [recentConsequences, setRecentConsequences] = useState<PlannerConsequence[]>([]);
  const [impactSummary, setImpactSummary] = useState<ImmediateImpactSummary | null>(null);
  const [reviewFlowState, setReviewFlowState] = useState<ReviewFlowState>(
    initialControllerState.reviewFlowState,
  );
  const [todaySummary, setTodaySummary] = useState(() =>
    getTodayDecisionSummary(initialControllerState.plannerData, initialControllerState.plannerData.dataOperacional),
  );
  const [shortHorizonSnapshot, setShortHorizonSnapshot] = useState<PlannerShortHorizonSnapshot>(() => ({
    load: getShortHorizonLoad(initialControllerState.plannerData, initialControllerState.plannerData.dataOperacional),
    pressurePoints: getUpcomingPressurePoints(initialControllerState.plannerData, initialControllerState.plannerData.dataOperacional),
    tomorrow: getTomorrowPreview(initialControllerState.plannerData, initialControllerState.plannerData.dataOperacional),
  }));
  const [rescheduleReviewItems, setRescheduleReviewItems] = useState<ReviewItemView[]>(() =>
    buildReviewItems({
      data: initialControllerState.plannerData,
      referenceDate: initialControllerState.plannerData.dataOperacional,
      state: initialControllerState.reviewFlowState,
    }),
  );
  const [rescheduleSuggestions, setRescheduleSuggestions] = useState<Record<string, ReviewOption | undefined>>({});
  const [pendingOperation, setPendingOperation] = useState<{
    kind: PlannerAppOperationKind;
    targetId?: string;
  } | null>(null);
  const [operationError, setOperationError] = useState<PlannerAppOperationError | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const deferredGlobalSearchQuery = useDeferredValue(globalSearchQuery);
  const retryLastOperationRef = useRef<null | (() => Promise<void>)>(null);
  const globalSearchResults = useMemo(
    () => searchPlannerData(plannerData, deferredGlobalSearchQuery),
    [deferredGlobalSearchQuery, plannerData],
  );

  const appState = (): PlannerAppStateSnapshot => ({
    plannerData,
    selectedDate,
    selectedSlotId,
    selectedWorkId,
    isDetailPanelOpen,
    reviewFlowState,
  });

  useEffect(() => {
    savePlannerPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (isRemoteMode) {
      return;
    }

    if (!preferences.persistLocalState) {
      clearPlannerLocalSnapshot();
      return;
    }

    savePlannerLocalSnapshot({
      plannerData,
      reviewFlowState,
      activeView,
      selectedDate,
      selectedSlotId,
      selectedWorkId,
      isDetailPanelOpen,
    });
  }, [
    activeView,
    isDetailPanelOpen,
    isRemoteMode,
    plannerData,
    preferences.persistLocalState,
    reviewFlowState,
    selectedDate,
    selectedSlotId,
    selectedWorkId,
  ]);

  useEffect(() => {
    if (!slotFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSlotFeedback(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [slotFeedback]);

  useEffect(() => {
    let cancelled = false;

    const refreshContext = async () => {
      const snapshot = appState();
      const meta = createRequestMeta();
      const [todayResponse, shortHorizonResponse, reviewItemsResponse] = await Promise.all([
        plannerApp.getTodaySummary({ meta, state: snapshot }),
        plannerApp.getShortHorizon({ meta, state: snapshot }),
        plannerApp.getReviewItems({ meta, state: snapshot }),
      ]);

      if (cancelled) {
        return;
      }

      if (todayResponse.ok) {
        setTodaySummary(todayResponse.data);
      }

      if (shortHorizonResponse.ok) {
        setShortHorizonSnapshot(shortHorizonResponse.data);
      }

      if (reviewItemsResponse.ok) {
        setRescheduleReviewItems(reviewItemsResponse.data);
      }
    };

    void refreshContext();

    return () => {
      cancelled = true;
    };
  }, [
    isDetailPanelOpen,
    plannerApp,
    plannerData,
    reviewFlowState,
    selectedDate,
    selectedSlotId,
    selectedWorkId,
  ]);

  useEffect(() => {
    let cancelled = false;
    const selectedAllocation = plannerData.alocacoes.find(
      (item) => item.slotId === selectedSlotId && item.dataPlanejada === selectedDate,
    );

    if (!selectedAllocation) {
      return;
    }

    const loadSuggestion = async () => {
      const response = await plannerApp.getRescheduleSuggestion({
        meta: createRequestMeta(),
        state: appState(),
        allocationId: selectedAllocation.id,
      });

      if (cancelled || !response.ok) {
        return;
      }

      setRescheduleSuggestions((current) => ({
        ...current,
        [selectedAllocation.id]: response.data,
      }));
    };

    void loadSuggestion();

    return () => {
      cancelled = true;
    };
  }, [plannerApp, plannerData, reviewFlowState, selectedDate, selectedSlotId, selectedWorkId, isDetailPanelOpen]);

  const navigate = (view: AppView) => {
    setActiveView(view);
  };

  const updatePreferences = (nextPreferences: Partial<PlannerUserPreferences>) => {
    setPreferences((current) => ({
      ...current,
      ...nextPreferences,
      localReferenceDate:
        nextPreferences.localReferenceDate === ""
          ? current.localReferenceDate
          : nextPreferences.localReferenceDate ?? current.localReferenceDate,
    }));
  };

  const resetLocalWorkspace = () => {
    if (isRemoteMode) {
      setSystemFeedback({
        title: "Ação disponível só no modo local",
        detail: "A restauração da seed local não altera o backend remoto atual.",
        tone: "warning",
        contextTag: {
          label: "Modo remoto",
          tone: "warning",
        },
      });
      return;
    }

    const nextSeed = createLocalControllerSeed(preferences);

    startTransition(() => {
      setPlannerData(nextSeed.plannerData);
      setReviewFlowState(nextSeed.reviewFlowState);
      setActiveView(nextSeed.activeView);
      setSelectedDate(nextSeed.selectedDate);
      setSelectedSlotId(nextSeed.selectedSlotId);
      setSelectedWorkId(nextSeed.selectedWorkId);
      setIsDetailPanelOpen(nextSeed.isDetailPanelOpen);
      setRescheduleSuggestions({});
      setRecentConsequences([]);
      setImpactSummary(null);
      setOperationError(null);
      setPendingOperation(null);
      setTodaySummary(
        getTodayDecisionSummary(nextSeed.plannerData, nextSeed.plannerData.dataOperacional),
      );
      setShortHorizonSnapshot({
        load: getShortHorizonLoad(nextSeed.plannerData, nextSeed.plannerData.dataOperacional),
        pressurePoints: getUpcomingPressurePoints(nextSeed.plannerData, nextSeed.plannerData.dataOperacional),
        tomorrow: getTomorrowPreview(nextSeed.plannerData, nextSeed.plannerData.dataOperacional),
      });
      setRescheduleReviewItems(
        buildReviewItems({
          data: nextSeed.plannerData,
          referenceDate: nextSeed.plannerData.dataOperacional,
          state: nextSeed.reviewFlowState,
        }),
      );
      setSystemFeedback({
        title: "Ambiente local restaurado",
        detail: `A operação voltou para a base local ${preferences.localReferenceDate}.`,
        tone: "success",
        contextTag: {
          label: "Seed local aplicada",
          tone: "success",
        },
      });
    });
  };

  const resetPreferences = () => {
    const defaults = resetStoredPlannerPreferences();
    setPreferences(defaults);
    setIsDetailPanelOpen(defaults.defaultDetailPanelOpen);
  };

  const shiftDate = (direction: -1 | 1) => {
    const candidate = addDays(selectedDate, direction);
    setSelectedDate(clampPlannerDate(candidate, plannerData.diasSemana));
  };

  const selectSlot = (slotId: string, date = selectedDate) => {
    const nextDate = clampPlannerDate(date, plannerData.diasSemana);
    setSelectedDate(nextDate);
    setSelectedSlotId(slotId);
    setIsDetailPanelOpen(true);

    const selectedAllocation = plannerData.alocacoes.find(
      (item) => item.slotId === slotId && item.dataPlanejada === nextDate,
    );
    if (!selectedAllocation) {
      return;
    }

    const selectedBlock = plannerData.blocos.find((item) => item.id === selectedAllocation.blocoId);
    if (selectedBlock) {
      setSelectedWorkId(selectedBlock.trabalhoId);
    }
  };

  const selectWork = (workId: string) => {
    setSelectedWorkId(workId);
  };

  const openGlobalSearchResult = (result: PlannerGlobalSearchResult) => {
    startTransition(() => {
      if (result.workId) {
        setSelectedWorkId(result.workId);
      }

      if (result.kind === "dependency") {
        setActiveView("blockings");
        setSystemFeedback({
          title: "Bloqueio localizado",
          detail: result.title,
          tone: "warning",
          contextTag: {
            label: "Busca global",
            tone: "warning",
          },
        });
      } else if (result.kind === "request") {
        setActiveView("requests");
        setSystemFeedback({
          title: "Solicitação localizada",
          detail: result.title,
          tone: "neutral",
          contextTag: {
            label: "Busca global",
            tone: "neutral",
          },
        });
      } else if (result.kind === "schedule" && result.slotId && result.date) {
        setActiveView("agendas");
        selectSlot(result.slotId, result.date);
        setSystemFeedback({
          title: "Agenda localizada",
          detail: result.title,
          tone: "opportunity",
          contextTag: {
            label: "Busca global",
            tone: "opportunity",
          },
        });
      } else {
        setActiveView("work-detail");
      }

      setGlobalSearchQuery("");
    });
  };

  const navigateSlots = (direction: -1 | 1) => {
    const timeline = getTimelineForDate(plannerData, selectedDate);
    const currentIndex = timeline.findIndex((item) => item.slot.id === selectedSlotId);
    const nextIndex = currentIndex >= 0 ? currentIndex + direction : 0;

    if (timeline[nextIndex]) {
      selectSlot(timeline[nextIndex].slot.id, selectedDate);
    }
  };

  const operationSetters = {
    setPlannerData,
    setSelectedDate,
    setSelectedSlotId,
    setSelectedWorkId,
    setIsDetailPanelOpen,
    setSlotFeedback,
    setRecentConsequences,
    setImpactSummary,
    setSystemFeedback,
    setReviewFlowState,
  };

  const applyOperation = (application: PlannerOperationApplication | null) => {
    if (!application) {
      return;
    }

    applyPlannerOperationState(operationSetters, application);
  };

  const runOperation = async (params: {
    kind: PlannerAppOperationKind;
    targetId?: string;
    retryable?: boolean;
    execute: () => Promise<PlannerAppOperationResponse>;
    onSuccess?: (application: PlannerOperationApplication) => void;
  }) => {
    setPendingOperation({
      kind: params.kind,
      targetId: params.targetId,
    });
    setOperationError(null);

    try {
      const response = await params.execute();

      if (!response.ok) {
        setOperationError(response.error);
        retryLastOperationRef.current = response.error.retryable
          ? () => runOperation(params)
          : null;
        return;
      }

      retryLastOperationRef.current = null;
      applyOperation(response.application);
      params.onSuccess?.(response.application);
    } finally {
      setPendingOperation((current) =>
        current?.kind === params.kind && current?.targetId === params.targetId
          ? null
          : current,
      );
    }
  };

  const runCommand = <K extends keyof PlannerCommandPayloadMap>(
    command: K,
    payload: PlannerCommandPayloadMap[K],
  ) => {
    void runOperation({
      kind: command,
      targetId: "allocationId" in payload ? payload.allocationId : undefined,
      execute: () =>
        plannerApp.executeCommand({
          meta: createRequestMeta(),
          state: appState(),
          command,
          payload,
        }),
    });
  };

  const startBlock = (allocationId: string) => {
    runCommand("start_block", { allocationId });
  };

  const completeBlock = (allocationId: string) => {
    runCommand("complete_block", { allocationId });
  };

  const markBlockPartial = (allocationId: string) => {
    runCommand("mark_block_partial", { allocationId });
  };

  const blockAllocation = (allocationId: string) => {
    void runOperation({
      kind: "open_dependency",
      targetId: allocationId,
      execute: () =>
        plannerApp.openDependency({
          meta: createRequestMeta(),
          state: appState(),
          allocationId,
        }),
    });
  };

  const rescheduleBlock = (
    allocationId: string,
    override?: { targetDate?: string; targetSlotId?: string; reason?: string },
  ) => {
    runCommand("reschedule_block", {
      allocationId,
      targetDate: override?.targetDate,
      targetSlotId: override?.targetSlotId,
      reason: override?.reason,
    });
  };

  const pullForwardBlock = (allocationId: string, slotId: string) => {
    runCommand("pull_forward_block", { allocationId, slotId });
  };

  const toggleDetailPanel = () => {
    runCommand("toggle_detail_panel", { nextOpen: !isDetailPanelOpen });
  };

  const selectNextFocus = () => {
    runCommand("select_next_focus", {});
  };

  const autoReplanDay = () => {
    runCommand("auto_replan_day", {});
  };

  const resolveDependency = (dependencyId: string) => {
    void runOperation({
      kind: "resolve_dependency",
      targetId: dependencyId,
      execute: () =>
        plannerApp.resolveDependency({
          meta: createRequestMeta(),
          state: appState(),
          dependencyId,
        }),
    });
  };

  const applyDependencyPolicy = (
    dependencyId: string,
    action: DependencyPolicyAction,
  ) => {
    void runOperation({
      kind: "apply_dependency_policy",
      targetId: dependencyId,
      execute: () =>
        plannerApp.applyDependencyPolicy({
          meta: createRequestMeta(),
          state: appState(),
          dependencyId,
          action,
        }),
    });
  };

  const addWork = (input: PlannerWorkInput) => {
    void runOperation({
      kind: "create_work",
      execute: () =>
        plannerApp.createWork({
          meta: createRequestMeta(),
          state: appState(),
          input,
        }),
      onSuccess: (application) => {
        if (application.nextWorkId) {
          setActiveView("work-detail");
        }
      },
    });
  };

  const addRequest = (input: PlannerRequestInput) => {
    void runOperation({
      kind: "create_request",
      execute: () =>
        plannerApp.createRequest({
          meta: createRequestMeta(),
          state: appState(),
          input,
        }),
    });
  };

  const updateAllocationStatus = (
    allocationId: string,
    status: "em_execucao" | "concluido" | "parcial" | "bloqueado" | "remarcado",
  ) => {
    const commands = {
      em_execucao: startBlock,
      concluido: completeBlock,
      parcial: markBlockPartial,
      bloqueado: blockAllocation,
      remarcado: (id: string) => rescheduleBlock(id),
    };

    commands[status](allocationId);
  };

  const getRescheduleSuggestion = (allocationId: string): ReviewOption | undefined =>
    rescheduleSuggestions[allocationId] ??
    rescheduleReviewItems.find((item) => item.allocationId === allocationId)?.suggestedOption;

  const applyRescheduleReview = (allocationId: string, option?: ReviewOption) => {
    void runOperation({
      kind: "resolve_review",
      targetId: allocationId,
      execute: () =>
        plannerApp.resolveReview({
          meta: createRequestMeta(),
          state: appState(),
          allocationId,
          action: "accept",
          option,
        }),
    });
  };

  const deferRescheduleReview = (allocationId: string) => {
    void runOperation({
      kind: "resolve_review",
      targetId: allocationId,
      execute: () =>
        plannerApp.resolveReview({
          meta: createRequestMeta(),
          state: appState(),
          allocationId,
          action: "defer",
        }),
    });
  };

  const ignoreRescheduleReview = (allocationId: string) => {
    void runOperation({
      kind: "resolve_review",
      targetId: allocationId,
      execute: () =>
        plannerApp.resolveReview({
          meta: createRequestMeta(),
          state: appState(),
          allocationId,
          action: "ignore",
        }),
    });
  };

  const retryLastOperation = () => {
    if (retryLastOperationRef.current) {
      void retryLastOperationRef.current();
    }
  };

  const dismissOperationError = () => {
    setOperationError(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isInputTarget(event.target)) {
        return;
      }

      if (!["today", "week", "agendas", "closing"].includes(activeView)) {
        return;
      }

      if (pendingOperation) {
        return;
      }

      const key = event.key.toLowerCase();
      const timeline = getTimelineForDate(plannerData, selectedDate);
      const selectedItem = timeline.find((item) => item.slot.id === selectedSlotId);

      if (key === "j") {
        event.preventDefault();
        navigateSlots(1);
        return;
      }

      if (key === "k") {
        event.preventDefault();
        navigateSlots(-1);
        return;
      }

      if (key === "o") {
        event.preventDefault();
        selectNextFocus();
        return;
      }

      if (key === "d") {
        event.preventDefault();
        toggleDetailPanel();
        return;
      }

      if (!selectedItem?.alocacao) {
        return;
      }

      if (key === "c") {
        event.preventDefault();
        completeBlock(selectedItem.alocacao.id);
      }

      if (key === "p") {
        event.preventDefault();
        markBlockPartial(selectedItem.alocacao.id);
      }

      if (key === "b") {
        event.preventDefault();
        blockAllocation(selectedItem.alocacao.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, isDetailPanelOpen, pendingOperation, plannerData, selectedDate, selectedSlotId]);

  return {
    plannerData,
    activeView,
    selectedDate,
    selectedSlotId,
    selectedWorkId,
    weekFilters,
    systemFeedback,
    slotFeedback,
    isDetailPanelOpen,
    recentConsequences,
    impactSummary,
    pendingOperation,
    operationError,
    preferences,
    globalSearchQuery,
    globalSearchResults,
    isRemoteMode,
    isOperationPending: Boolean(pendingOperation),
    rescheduleReviewItems,
    setWeekFilters,
    setGlobalSearchQuery,
    navigate,
    shiftDate,
    selectSlot,
    selectWork,
    setSelectedDate,
    setDetailPanelOpen: setIsDetailPanelOpen,
    startBlock,
    completeBlock,
    markBlockPartial,
    blockAllocation,
    rescheduleBlock,
    pullForwardBlock,
    applyDependencyPolicy,
    resolveDependency,
    addWork,
    addRequest,
    autoReplanDay,
    navigateSlots,
    selectNextFocus,
    toggleDetailPanel,
    getRescheduleSuggestion,
    updateAllocationStatus,
    applyRescheduleReview,
    deferRescheduleReview,
    ignoreRescheduleReview,
    retryLastOperation,
    dismissOperationError,
    updatePreferences,
    resetLocalWorkspace,
    resetPreferences,
    openGlobalSearchResult,
    getTodaySummary: () => todaySummary,
    getShortHorizonSnapshot: () => shortHorizonSnapshot,
  };
}

export type PlannerController = ReturnType<typeof usePlannerState>;

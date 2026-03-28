import { createMockPlannerData } from "../data/mockData";
import { getTimelineForDate } from "../data/selectors";
import { clampPlannerDateForward } from "../domain/plannerDerivedState";
import { applyPlannerDerivedState } from "../domain/plannerDerivedState";
import { createEmptyReviewState } from "../domain/plannerReviewFlow";
import type { ReviewFlowState } from "../types/domain";
import type { PlannerData } from "../types/planner";
import type { AppView, PlannerStartupView, PlannerUserPreferences } from "../types/ui";
import { getOperationalDate } from "../utils/date";

const plannerPreferencesStorageKey = "planner.preferences.v1";
const plannerLocalSnapshotStorageKey = "planner.local-snapshot.v1";

export const PLANNER_LOCAL_REFERENCE_DATE = "2026-03-23";

interface PersistedPreferences {
  version: 1;
  preferences: PlannerUserPreferences;
}

interface PersistedLocalSnapshot {
  version: 1;
  savedAt: string;
  plannerData: PlannerData;
  reviewFlowState: ReviewFlowState;
  activeView: AppView;
  selectedDate: string;
  selectedSlotId: string;
  selectedWorkId: string;
  isDetailPanelOpen: boolean;
}

export interface PlannerLocalControllerSeed {
  plannerData: PlannerData;
  reviewFlowState: ReviewFlowState;
  activeView: AppView;
  selectedDate: string;
  selectedSlotId: string;
  selectedWorkId: string;
  isDetailPanelOpen: boolean;
}

export function getPlannerSelectionForDate(plannerData: PlannerData, selectedDate: string) {
  const timeline = getTimelineForDate(plannerData, selectedDate);
  const focusedItem =
    timeline.find((item) =>
      ["em_execucao", "planejado", "parcial", "remarcado", "antecipado"].includes(item.statusVisual),
    ) ??
    timeline.find((item) => item.alocacao) ??
    timeline[0];

  return {
    selectedSlotId: focusedItem?.slot.id ?? plannerData.slots[0]?.id ?? "",
    selectedWorkId: focusedItem?.bloco?.trabalhoId ?? plannerData.trabalhos[0]?.id ?? "",
  };
}

export function getPlannerOperationalFocusDate(
  plannerData: PlannerData,
  now = new Date(),
) {
  return clampPlannerDateForward(getOperationalDate(now), plannerData.diasSemana);
}

export function alignControllerSeedToOperationalFocus(
  seed: PlannerLocalControllerSeed,
  now = new Date(),
): PlannerLocalControllerSeed {
  const selectedDate = getPlannerOperationalFocusDate(seed.plannerData, now);

  if (selectedDate === seed.selectedDate) {
    return seed;
  }

  const nextSelection = getPlannerSelectionForDate(seed.plannerData, selectedDate);
  return {
    ...seed,
    selectedDate,
    ...nextSelection,
  };
}

function hasWindow() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isStartupView(value: unknown): value is PlannerStartupView {
  return [
    "today",
    "week",
    "agendas",
    "works",
    "requests",
    "blockings",
    "capacity",
    "closing",
    "settings",
  ].includes(String(value));
}

function isAppView(value: unknown): value is AppView {
  return [
    "today",
    "week",
    "agendas",
    "works",
    "requests",
    "blockings",
    "capacity",
    "closing",
    "new-work",
    "work-detail",
    "settings",
  ].includes(String(value));
}

function isPlannerUserPreferences(value: unknown): value is PlannerUserPreferences {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isStartupView(candidate.startupView) &&
    typeof candidate.persistLocalState === "boolean" &&
    typeof candidate.localReferenceDate === "string" &&
    typeof candidate.defaultDetailPanelOpen === "boolean"
  );
}

function isPersistedPreferences(value: unknown): value is PersistedPreferences {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.version === 1 && isPlannerUserPreferences(candidate.preferences);
}

function isPersistedLocalSnapshot(value: unknown): value is PersistedLocalSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    Boolean(candidate.plannerData) &&
    Boolean(candidate.reviewFlowState) &&
    isAppView(candidate.activeView) &&
    typeof candidate.selectedDate === "string" &&
    typeof candidate.selectedSlotId === "string" &&
    typeof candidate.selectedWorkId === "string" &&
    typeof candidate.isDetailPanelOpen === "boolean"
  );
}

export function createDefaultPlannerPreferences(): PlannerUserPreferences {
  return {
    startupView: "today",
    persistLocalState: true,
    localReferenceDate: PLANNER_LOCAL_REFERENCE_DATE,
    defaultDetailPanelOpen: true,
  };
}

export function loadPlannerPreferences(): PlannerUserPreferences {
  if (!hasWindow()) {
    return createDefaultPlannerPreferences();
  }

  try {
    const raw = window.localStorage.getItem(plannerPreferencesStorageKey);
    if (!raw) {
      return createDefaultPlannerPreferences();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedPreferences(parsed)) {
      return createDefaultPlannerPreferences();
    }

    return parsed.preferences;
  } catch {
    return createDefaultPlannerPreferences();
  }
}

export function savePlannerPreferences(preferences: PlannerUserPreferences) {
  if (!hasWindow()) {
    return;
  }

  const payload: PersistedPreferences = {
    version: 1,
    preferences,
  };
  window.localStorage.setItem(plannerPreferencesStorageKey, JSON.stringify(payload));
}

export function createLocalControllerSeed(
  preferences: PlannerUserPreferences,
): PlannerLocalControllerSeed {
  const raw = createMockPlannerData(
    new Date(`${preferences.localReferenceDate}T12:00:00.000Z`),
  );
  const plannerData = applyPlannerDerivedState(raw, raw.dataOperacional);

  return alignControllerSeedToOperationalFocus({
    plannerData,
    reviewFlowState: createEmptyReviewState(),
    activeView: preferences.startupView,
    selectedDate: plannerData.dataOperacional,
    selectedSlotId: "slot-2",
    selectedWorkId: "proposta-acme",
    isDetailPanelOpen: preferences.defaultDetailPanelOpen,
  });
}

export function loadPlannerLocalSnapshot(): PlannerLocalControllerSeed | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(plannerLocalSnapshotStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedLocalSnapshot(parsed)) {
      return null;
    }

    return alignControllerSeedToOperationalFocus({
      plannerData: parsed.plannerData,
      reviewFlowState: parsed.reviewFlowState,
      activeView: parsed.activeView,
      selectedDate: parsed.selectedDate,
      selectedSlotId: parsed.selectedSlotId,
      selectedWorkId: parsed.selectedWorkId,
      isDetailPanelOpen: parsed.isDetailPanelOpen,
    });
  } catch {
    return null;
  }
}

export function savePlannerLocalSnapshot(snapshot: PlannerLocalControllerSeed) {
  if (!hasWindow()) {
    return;
  }

  const payload: PersistedLocalSnapshot = {
    version: 1,
    savedAt: new Date().toISOString(),
    plannerData: snapshot.plannerData,
    reviewFlowState: snapshot.reviewFlowState,
    activeView: snapshot.activeView,
    selectedDate: snapshot.selectedDate,
    selectedSlotId: snapshot.selectedSlotId,
    selectedWorkId: snapshot.selectedWorkId,
    isDetailPanelOpen: snapshot.isDetailPanelOpen,
  };
  window.localStorage.setItem(plannerLocalSnapshotStorageKey, JSON.stringify(payload));
}

export function clearPlannerLocalSnapshot() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(plannerLocalSnapshotStorageKey);
}

export function resetPlannerPreferences() {
  const defaults = createDefaultPlannerPreferences();
  savePlannerPreferences(defaults);
  return defaults;
}

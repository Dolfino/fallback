import type { Prioridade, SlotStatus } from "./planner";

export type AppView =
  | "today"
  | "week"
  | "agendas"
  | "works"
  | "requests"
  | "blockings"
  | "capacity"
  | "closing"
  | "new-work"
  | "work-detail"
  | "settings";

export type PlannerStartupView = Exclude<AppView, "new-work" | "work-detail">;

export interface WeekFilters {
  prioridade: Prioridade | "todas";
  status: SlotStatus | "todos";
  apenasRisco: boolean;
}

export interface PlannerUserPreferences {
  startupView: PlannerStartupView;
  persistLocalState: boolean;
  localReferenceDate: string;
  defaultDetailPanelOpen: boolean;
}

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

export interface WeekFilters {
  prioridade: Prioridade | "todas";
  status: SlotStatus | "todos";
  apenasRisco: boolean;
}

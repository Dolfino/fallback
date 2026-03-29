import { describe, expect, it } from "vitest";
import { createMockPlannerData } from "../../data/mockData";
import {
  getCapacitySummary,
  getRemainingHorizonDates,
  getUpcomingDeliveries,
  getWeekMatrix,
  isWorkOperationallyVisible,
} from "../../data/selectors";
import { applyPlannerDerivedState } from "../../domain/plannerDerivedState";

describe("planner horizon selectors", () => {
  it("derives the visible horizon from the selected date", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    expect(getRemainingHorizonDates(data, "2026-03-30")).toEqual([
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
    ]);
  });

  it("builds the week matrix only for the visible horizon", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);
    const visibleDates = getRemainingHorizonDates(data, "2026-03-30");
    const matrix = getWeekMatrix(
      data,
      {
        prioridade: "todas",
        status: "todos",
        apenasRisco: false,
      },
      visibleDates,
    );

    expect(matrix[0]?.cells.map((cell) => cell.date)).toEqual(visibleDates);
  });

  it("computes capacity summary for the visible horizon only", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);
    const visibleDates = getRemainingHorizonDates(data, "2026-03-30");
    const summary = getCapacitySummary(data, visibleDates);

    expect(summary.totalMin).toBe(data.slots.length * visibleDates.length * 25);
  });

  it("excludes completed work from the week upcoming deliveries rail", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    raw.trabalhos[0] = {
      ...raw.trabalhos[0],
      status: "concluido",
      percentualConclusao: 100,
    };
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const deliveries = getUpcomingDeliveries(data);

    expect(deliveries.some((trabalho) => trabalho.status === "concluido")).toBe(false);
    expect(deliveries.some((trabalho) => trabalho.percentualConclusao >= 100)).toBe(false);
  });

  it("treats completed work as not operationally visible", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));

    expect(isWorkOperationallyVisible(raw.trabalhos[0])).toBe(true);
    expect(
      isWorkOperationallyVisible({
        ...raw.trabalhos[0],
        status: "concluido",
        percentualConclusao: 100,
      }),
    ).toBe(false);
  });
});

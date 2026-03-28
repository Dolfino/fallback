import { describe, expect, it } from "vitest";
import { createMockPlannerData } from "../../data/mockData";
import { buildReviewItems, getSuggestedReviewOption } from "../../domain/plannerReviewFlow";
import type { ReviewFlowState } from "../../types/domain";
import type { PlannerData } from "../../types/planner";

function fillDatesWithPlannedAllocations(
  data: PlannerData,
  dates: string[],
): PlannerData {
  let sequence = 0;

  const fillers = dates.flatMap((date) => {
    const occupiedSlotIds = new Set(
      data.alocacoes.filter((item) => item.dataPlanejada === date).map((item) => item.slotId),
    );

    return data.slots
      .filter((slot) => !occupiedSlotIds.has(slot.id))
      .map((slot) => {
        sequence += 1;

        return {
          id: `filler-${date}-${slot.id}-${sequence}`,
          blocoId: "bloco-crm-legado-1",
          dataPlanejada: date,
          slotId: slot.id,
          statusAlocacao: "planejado" as const,
          origemAlocacao: "planejamento_inicial" as const,
        };
      });
  });

  return {
    ...data,
    alocacoes: [...data.alocacoes, ...fillers],
  };
}

describe("plannerReviewFlow", () => {
  const emptyReviewState: ReviewFlowState = {
    activeAllocationIds: [],
    decisions: {},
  };

  it("suggests a remarcação na próxima semana when the current week is saturated", () => {
    const baseData = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    const constrainedData = fillDatesWithPlannedAllocations(
      baseData,
      ["2026-03-25", "2026-03-26", "2026-03-27"],
    );

    const suggestion = getSuggestedReviewOption(constrainedData, "2026-03-25", "aloc-30");

    expect(suggestion).toBeTruthy();
    expect(suggestion?.date).toBe("2026-03-30");
    expect(suggestion?.slotId).toBe("slot-1");
  });

  it("keeps next-week alternatives visible in the review panel", () => {
    const data = createMockPlannerData(new Date("2026-03-23T12:00:00"));
    const items = buildReviewItems({
      data,
      referenceDate: "2026-03-25",
      state: {
        ...emptyReviewState,
        activeAllocationIds: ["aloc-30"],
      },
    });

    const item = items.find((entry) => entry.allocationId === "aloc-30");

    expect(item).toBeTruthy();
    expect(item?.alternatives).toHaveLength(5);
    expect(item?.alternatives.some((option) => option.date === "2026-03-30")).toBe(true);
  });
});

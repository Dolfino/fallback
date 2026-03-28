import { describe, expect, it } from "vitest";
import {
  alignControllerSeedToOperationalFocus,
  getPlannerOperationalFocusDate,
} from "../../application/plannerBrowserStorage";
import { createMockPlannerData } from "../../data/mockData";
import { applyPlannerDerivedState } from "../../domain/plannerDerivedState";
import { createEmptyReviewState } from "../../domain/plannerReviewFlow";

describe("planner startup focus", () => {
  const raw = createMockPlannerData(new Date("2026-03-23T12:00:00"));
  const plannerData = applyPlannerDerivedState(raw, raw.dataOperacional);

  it("focuses the current weekday when it exists in the visible horizon", () => {
    expect(getPlannerOperationalFocusDate(plannerData, new Date("2026-03-25T12:00:00"))).toBe("2026-03-25");
  });

  it("focuses the next business day when the real date is a weekend", () => {
    expect(getPlannerOperationalFocusDate(plannerData, new Date("2026-03-28T12:00:00"))).toBe("2026-03-30");
  });

  it("realigns the startup seed to the operational focus date", () => {
    const seed = alignControllerSeedToOperationalFocus(
      {
        plannerData,
        reviewFlowState: createEmptyReviewState(),
        activeView: "today",
        selectedDate: "2026-03-23",
        selectedSlotId: "slot-2",
        selectedWorkId: "proposta-acme",
        isDetailPanelOpen: true,
      },
      new Date("2026-03-28T12:00:00"),
    );

    expect(seed.selectedDate).toBe("2026-03-30");
    expect(seed.selectedSlotId).toBe("slot-1");
  });
});

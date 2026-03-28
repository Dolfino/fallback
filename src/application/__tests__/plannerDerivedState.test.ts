import { describe, expect, it } from "vitest";
import { clampPlannerDateForward, shiftPlannerDate } from "../../domain/plannerDerivedState";

describe("plannerDerivedState", () => {
  const horizon = [
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    "2026-03-30",
    "2026-03-31",
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
  ];

  it("shifts from friday to the next monday in the visible horizon", () => {
    expect(shiftPlannerDate("2026-03-27", 1, horizon)).toBe("2026-03-30");
  });

  it("shifts from monday back to the previous friday in the visible horizon", () => {
    expect(shiftPlannerDate("2026-03-30", -1, horizon)).toBe("2026-03-27");
  });

  it("resolves a weekend date to the next available business day", () => {
    expect(clampPlannerDateForward("2026-03-28", horizon)).toBe("2026-03-30");
    expect(clampPlannerDateForward("2026-03-29", horizon)).toBe("2026-03-30");
  });
});

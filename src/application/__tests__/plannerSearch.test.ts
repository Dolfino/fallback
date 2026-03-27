import { describe, expect, it } from "vitest";
import { createMockPlannerData } from "../../data/mockData";
import { applyPlannerDerivedState } from "../../domain/plannerDerivedState";
import { searchPlannerData } from "../../domain/plannerSearch";

describe("plannerSearch", () => {
  it("finds work results by client and title", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "acme");

    expect(results[0]?.kind).toBe("work");
    expect(results[0]?.title).toContain("Acme");
  });

  it("finds blocking results by dependency description", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "juridica");

    expect(results.some((result) => result.kind === "dependency")).toBe(true);
  });
});

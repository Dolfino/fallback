import { describe, expect, it } from "vitest";
import { createMockPlannerData } from "../../data/mockData";
import { applyPlannerDerivedState } from "../../domain/plannerDerivedState";
import { searchPlannerData } from "../../domain/plannerSearch";

describe("plannerSearch", () => {
  it("finds work results by client and title", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "acme");

    expect(results.some((result) => result.kind === "work" && result.title.includes("Acme"))).toBe(true);
  });

  it("finds blocking results by dependency description", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "juridica");

    expect(results.some((result) => result.kind === "dependency")).toBe(true);
  });

  it("finds request results by request title and area", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "orion");

    expect(results.some((result) => result.kind === "request")).toBe(true);
  });

  it("finds schedule results by agenda label and time", () => {
    const raw = createMockPlannerData(new Date("2026-03-23T12:00:00.000Z"));
    const data = applyPlannerDerivedState(raw, raw.dataOperacional);

    const results = searchPlannerData(data, "agenda 02");

    expect(results.some((result) => result.kind === "schedule")).toBe(true);
  });
});

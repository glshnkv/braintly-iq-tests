import { describe, expect, it } from "vitest";
import { perceivedProgress } from "./progress";

describe("perceived progress", () => {
  const N = 25;

  it("starts at 0 and ends exactly at 100%", () => {
    expect(perceivedProgress(0, N)).toBe(0);
    expect(perceivedProgress(N, N)).toBeCloseTo(1, 10);
  });

  it("makes a big first jump", () => {
    expect(perceivedProgress(1, N)).toBeGreaterThan(0.25);
  });

  it("only grows, by ever smaller steps", () => {
    let prevValue = 0;
    let prevStep = Infinity;
    for (let n = 1; n <= N; n++) {
      const value = perceivedProgress(n, N);
      const step = value - prevValue;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(prevStep);
      prevValue = value;
      prevStep = step;
    }
  });

  it("clamps out-of-range input and degrades to linear when the curve is off", () => {
    expect(perceivedProgress(-3, N)).toBe(0);
    expect(perceivedProgress(99, N)).toBeCloseTo(1, 10);
    expect(perceivedProgress(5, 10, 0)).toBe(0.5);
  });
});

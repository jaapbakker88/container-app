import { describe, expect, it } from "vitest";
import { haversineKm } from "./haversineKm";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(52.3676, 4.9041, 52.3676, 4.9041)).toBe(0);
  });

  it("calculates Amsterdam to Rotterdam (~57 km)", () => {
    const km = haversineKm(52.3676, 4.9041, 51.9225, 4.4792);
    expect(km).toBeGreaterThan(56);
    expect(km).toBeLessThan(58);
  });

  it("is symmetric — A→B equals B→A", () => {
    const ab = haversineKm(52.3676, 4.9041, 51.9225, 4.4792);
    const ba = haversineKm(51.9225, 4.4792, 52.3676, 4.9041);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it("returns a positive value for any two different points", () => {
    expect(haversineKm(0, 0, 1, 1)).toBeGreaterThan(0);
  });

  it("handles antipodal points (~20015 km)", () => {
    const km = haversineKm(0, 0, 0, 180);
    expect(km).toBeGreaterThan(20000);
    expect(km).toBeLessThan(20100);
  });
});

import { describe, expect, it } from "vitest";
import { formatCardNumber, formatExpiry, isCvcValid, isExpiryValid, isLuhnValid } from "./card";

describe("card validation", () => {
  it("validates Luhn checksums", () => {
    expect(isLuhnValid("4242 4242 4242 4242")).toBe(true);
    expect(isLuhnValid("4000000000000002")).toBe(true);
    expect(isLuhnValid("4242 4242 4242 4241")).toBe(false);
    expect(isLuhnValid("1234")).toBe(false);
  });

  it("validates expiry relative to now", () => {
    const now = new Date(2026, 10, 13);
    expect(isExpiryValid("11/26", now)).toBe(true);
    expect(isExpiryValid("10/26", now)).toBe(false);
    expect(isExpiryValid("13/30", now)).toBe(false);
    expect(isExpiryValid("1/30", now)).toBe(false);
  });

  it("validates CVC", () => {
    expect(isCvcValid("123")).toBe(true);
    expect(isCvcValid("1234")).toBe(true);
    expect(isCvcValid("12a")).toBe(false);
  });

  it("formats inputs", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatExpiry("1228")).toBe("12/28");
    expect(formatExpiry("1")).toBe("1");
  });
});

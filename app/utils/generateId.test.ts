import { describe, expect, it } from "vitest";
import { generateId, isValidContainerId } from "./generateId";

const VALID_CHARS = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split(""));

describe("generateId", () => {
  it("returns a string of default length 5", () => {
    expect(generateId()).toHaveLength(5);
  });

  it("returns a string of a custom length", () => {
    expect(generateId(8)).toHaveLength(8);
  });

  it("only uses characters from the allowed alphabet", () => {
    // Use a long ID to cover the character space
    for (const char of generateId(200)) {
      expect(VALID_CHARS.has(char)).toBe(true);
    }
  });

  it("never contains ambiguous characters I, O, or 0", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateId()).not.toMatch(/[IO0]/);
    }
  });
});

describe("isValidContainerId", () => {
  it("accepts a valid 5-char code", () => {
    expect(isValidContainerId("ABC23")).toBe(true);
  });

  it("rejects a code shorter than 5 chars", () => {
    expect(isValidContainerId("ABCD")).toBe(false);
  });

  it("rejects a code longer than 5 chars", () => {
    expect(isValidContainerId("ABCDEF")).toBe(false);
  });

  it("rejects lowercase letters", () => {
    expect(isValidContainerId("abc23")).toBe(false);
  });

  it("rejects codes containing O", () => {
    expect(isValidContainerId("ABCDO")).toBe(false);
  });

  it("rejects codes containing I", () => {
    expect(isValidContainerId("ABCDI")).toBe(false);
  });

  it("rejects codes containing 0 (zero)", () => {
    expect(isValidContainerId("ABC20")).toBe(false);
  });

  it("rejects codes with special characters", () => {
    expect(isValidContainerId("AB-23")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidContainerId("")).toBe(false);
  });
});

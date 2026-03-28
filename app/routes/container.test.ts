import { beforeEach, describe, expect, it } from "vitest";
import { action, loader } from "./container";
import { db } from "~/db/sqlite";

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

function makeFormRequest(url: string, fields: Record<string, string>) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) formData.set(k, v);
  return new Request(url, { method: "POST", body: formData });
}

beforeEach(() => {
  db.exec("DELETE FROM reports; DELETE FROM users; DELETE FROM containers;");
  db.prepare(
    "INSERT INTO containers (code, type, isFull, lat, lng) VALUES (?,?,?,?,?)"
  ).run("AAAAA", "paper", 0, 52.37, 4.89);
  db.prepare(
    "INSERT INTO containers (code, type, isFull, lat, lng) VALUES (?,?,?,?,?)"
  ).run("BBBBB", "glass", 0, 52.371, 4.891); // ~130m from AAAAA
  db.prepare(
    "INSERT INTO containers (code, type, isFull, lat, lng) VALUES (?,?,?,?,?)"
  ).run("CCCCC", "plastic", 1, 52.372, 4.892); // full — should be excluded
});

describe("container action — fullness", () => {
  it("marks container as full and returns correct payload", async () => {
    const result = await action({
      request: makeFormRequest("http://localhost/AAAAA", {
        intent: "fullness",
        fullness: "full",
      }),
      params: { containerId: "AAAAA" },
      context: {},
    });

    expect(result).toEqual({ intent: "fullness", updated: true, isFull: true });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(1);
  });

  it("marks container as empty and returns correct payload", async () => {
    db.prepare("UPDATE containers SET isFull = 1 WHERE code = 'AAAAA'").run();

    const result = await action({
      request: makeFormRequest("http://localhost/AAAAA", {
        intent: "fullness",
        fullness: "empty",
      }),
      params: { containerId: "AAAAA" },
      context: {},
    });

    expect(result).toEqual({
      intent: "fullness",
      updated: true,
      isFull: false,
    });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(0);
  });

  it("returns error for invalid fullness value without touching DB", async () => {
    const result = await action({
      request: makeFormRequest("http://localhost/AAAAA", {
        intent: "fullness",
        fullness: "maybe",
      }),
      params: { containerId: "AAAAA" },
      context: {},
    });

    expect(result).toMatchObject({ error: expect.any(String) });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(0); // unchanged
  });
});

describe("container loader — nearby list", () => {
  it("excludes the current container from the nearby list", () => {
    const result = loader({
      request: makeRequest("http://localhost/AAAAA"),
      params: { containerId: "AAAAA" },
      context: {},
    });

    // loader may return a redirect Response for invalid codes; for valid
    // codes it returns a plain object
    expect(result).not.toBeInstanceOf(Response);
    const { nearby } = result as Awaited<ReturnType<typeof loader>>;
    expect(nearby.every((c) => c.code !== "AAAAA")).toBe(true);
  });

  it("excludes full containers from the nearby list", () => {
    const result = loader({
      request: makeRequest("http://localhost/AAAAA"),
      params: { containerId: "AAAAA" },
      context: {},
    });

    const { nearby } = result as Awaited<ReturnType<typeof loader>>;
    expect(nearby.find((c) => c.code === "CCCCC")).toBeUndefined();
  });

  it("includes nearby empty containers in the list", () => {
    const result = loader({
      request: makeRequest("http://localhost/AAAAA"),
      params: { containerId: "AAAAA" },
      context: {},
    });

    const { nearby } = result as Awaited<ReturnType<typeof loader>>;
    expect(nearby.find((c) => c.code === "BBBBB")).toBeDefined();
  });
});

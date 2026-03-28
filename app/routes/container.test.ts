import { beforeEach, describe, expect, it } from "vitest";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { action, loader } from "./container";
import { db } from "~/db/sqlite";

// React Router 7 requires unstable_pattern in args; cast for tests
function actionArgs(
  url: string,
  params: Record<string, string>,
  options?: RequestInit
): ActionFunctionArgs {
  return {
    request: new Request(url, options),
    params,
    context: {},
  } as unknown as ActionFunctionArgs;
}

function loaderArgs(
  url: string,
  params: Record<string, string>
): LoaderFunctionArgs {
  return {
    request: new Request(url),
    params,
    context: {},
  } as unknown as LoaderFunctionArgs;
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
    const result = await action(
      actionArgs("http://localhost/AAAAA", { containerId: "AAAAA" }, {
        method: "POST",
        body: (() => {
          const f = new FormData();
          f.set("intent", "fullness");
          f.set("fullness", "full");
          return f;
        })(),
      })
    );

    expect(result).toEqual({ intent: "fullness", updated: true, isFull: true });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(1);
  });

  it("marks container as empty and returns correct payload", async () => {
    db.prepare("UPDATE containers SET isFull = 1 WHERE code = 'AAAAA'").run();

    const result = await action(
      actionArgs("http://localhost/AAAAA", { containerId: "AAAAA" }, {
        method: "POST",
        body: (() => {
          const f = new FormData();
          f.set("intent", "fullness");
          f.set("fullness", "empty");
          return f;
        })(),
      })
    );

    expect(result).toEqual({ intent: "fullness", updated: true, isFull: false });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(0);
  });

  it("returns error for invalid fullness value without touching DB", async () => {
    const result = await action(
      actionArgs("http://localhost/AAAAA", { containerId: "AAAAA" }, {
        method: "POST",
        body: (() => {
          const f = new FormData();
          f.set("intent", "fullness");
          f.set("fullness", "maybe");
          return f;
        })(),
      })
    );

    expect(result).toMatchObject({ error: expect.any(String) });

    const row = db
      .prepare("SELECT isFull FROM containers WHERE code = ?")
      .get("AAAAA") as { isFull: number };
    expect(row.isFull).toBe(0); // unchanged
  });
});

type LoaderResult = Exclude<Awaited<ReturnType<typeof loader>>, Response>;

describe("container loader — nearby list", () => {
  it("excludes the current container from the nearby list", () => {
    const result = loader(loaderArgs("http://localhost/AAAAA", { containerId: "AAAAA" }));

    expect(result).not.toBeInstanceOf(Response);
    const { nearby } = result as LoaderResult;
    expect(nearby.every((c: LoaderResult["nearby"][number]) => c.code !== "AAAAA")).toBe(true);
  });

  it("excludes full containers from the nearby list", () => {
    const result = loader(loaderArgs("http://localhost/AAAAA", { containerId: "AAAAA" }));

    const { nearby } = result as LoaderResult;
    expect(nearby.find((c: LoaderResult["nearby"][number]) => c.code === "CCCCC")).toBeUndefined();
  });

  it("includes nearby empty containers in the list", () => {
    const result = loader(loaderArgs("http://localhost/AAAAA", { containerId: "AAAAA" }));

    const { nearby } = result as LoaderResult;
    expect(nearby.find((c: LoaderResult["nearby"][number]) => c.code === "BBBBB")).toBeDefined();
  });
});

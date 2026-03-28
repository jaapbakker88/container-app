import { describe, expect, it } from "vitest";
import { parseCookies } from "./parseCookies";

describe("parseCookies", () => {
  it("returns empty object for null", () => {
    expect(parseCookies(null)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(parseCookies("")).toEqual({});
  });

  it("parses a single key=value pair", () => {
    expect(parseCookies("foo=bar")).toEqual({ foo: "bar" });
  });

  it("parses multiple cookies separated by semicolons", () => {
    expect(parseCookies("a=1; b=2; c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("handles values that contain = signs", () => {
    expect(parseCookies("token=abc=def==")).toEqual({ token: "abc=def==" });
  });

  it("decodes URL-encoded values", () => {
    expect(parseCookies("name=hello%20world")).toEqual({ name: "hello world" });
  });

  it("returns empty string for a key with no value", () => {
    expect(parseCookies("session")).toEqual({ session: "" });
  });

  it("trims whitespace around keys", () => {
    expect(parseCookies("a=1;  b=2")).toEqual({ a: "1", b: "2" });
  });
});

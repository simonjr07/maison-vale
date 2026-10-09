import { describe, expect, it } from "vitest";

import { inspectUnauthenticatedAdminResponse } from "./hosted-admin-boundary";

const origin = "https://maison-vale.example";

function inspect(overrides: Partial<Parameters<typeof inspectUnauthenticatedAdminResponse>[0]> = {}) {
  return inspectUnauthenticatedAdminResponse({
    status: 200,
    location: null,
    contentType: "text/html; charset=utf-8",
    cacheControl: "private, no-store, max-age=0",
    body: '<script>self.__next_f.push([1,"9:E{\\"digest\\":\\"NEXT_REDIRECT;replace;/admin/login;307;\\"}"])</script>',
    origin,
    ...overrides,
  });
}

describe("hosted unauthenticated admin boundary", () => {
  it("accepts a conventional same-origin login redirect", () => {
    expect(inspect({ status: 307, location: "/admin/login", body: "" })).toEqual({
      secure: true,
      mode: "http-redirect",
    });
  });

  it("accepts Next.js streamed redirect control records", () => {
    expect(inspect()).toEqual({ secure: true, mode: "streamed-redirect" });
  });

  it("accepts the documented streaming meta refresh form", () => {
    expect(inspect({ body: '<meta http-equiv="refresh" content="1;url=/admin/login">' })).toEqual({
      secure: true,
      mode: "streamed-redirect",
    });
  });

  it("rejects an external redirect even when its path resembles the login route", () => {
    expect(inspect({ status: 307, location: "https://attacker.example/admin/login", body: "" }).secure).toBe(false);
  });

  it("rejects an ordinary HTTP 200 page that merely links to login", () => {
    expect(inspect({ body: '<a href="/admin/login">Sign in</a>' }).secure).toBe(false);
  });

  it("rejects a streamed redirect to another destination", () => {
    expect(inspect({ body: "NEXT_REDIRECT;replace;/admin/orders;307;" }).secure).toBe(false);
  });

  it("rejects protected admin content in an unauthenticated stream", () => {
    expect(inspect({ body: "NEXT_REDIRECT;replace;/admin/login;307; Admin navigation" }).secure).toBe(false);
  });

  it("rejects a cacheable HTTP 200 stream", () => {
    expect(inspect({ cacheControl: "public, max-age=300" }).secure).toBe(false);
  });
});

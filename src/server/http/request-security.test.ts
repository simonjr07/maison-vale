import { describe, expect, it } from "vitest";

import {
  RequestBodyTooLargeError,
  getApplicationOrigin,
  getTrustedRequestSource,
  hasExpectedOrigin,
  readBoundedText,
} from "./request-security";

describe("request security", () => {
  it("trusts Vercel's protected forwarding header and normalizes IPv4 and IPv6", () => {
    expect(getTrustedRequestSource(new Headers({ "x-vercel-forwarded-for": "203.0.113.8" }), { VERCEL: "1", NODE_ENV: "production" })).toBe("203.0.113.8");
    expect(getTrustedRequestSource(new Headers({ "x-vercel-forwarded-for": "2001:db8::1" }), { VERCEL: "1", NODE_ENV: "production" })).toBe("2001:db8::1");
  });

  it("does not trust caller-controlled forwarding headers in generic production", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.8" });
    expect(getTrustedRequestSource(headers, { NODE_ENV: "production" })).toBe("unavailable");
    expect(getTrustedRequestSource(headers, { NODE_ENV: "production", TRUST_PROXY_HEADERS: "true" })).toBe("203.0.113.8");
  });

  it("rejects malformed forwarded values", () => {
    expect(getTrustedRequestSource(new Headers({ "x-forwarded-for": "attacker-value" }), { NODE_ENV: "development" })).toBe("unavailable");
  });

  it("requires a canonical HTTPS application origin in production", () => {
    expect(getApplicationOrigin("https://request.example", { NODE_ENV: "production" })).toBeNull();
    expect(getApplicationOrigin("https://request.example", { NODE_ENV: "production", APP_URL: "http://shop.example" })).toBeNull();
    expect(getApplicationOrigin("https://request.example", { NODE_ENV: "production", APP_URL: "https://shop.example/" })).toBe("https://shop.example");
    expect(getApplicationOrigin("https://request.example", { NODE_ENV: "production", APP_URL: "https://shop.example/path" })).toBeNull();
  });

  it("requires an exact Origin header", () => {
    expect(hasExpectedOrigin(new Request("https://shop.example/api", { headers: { origin: "https://shop.example" } }), "https://shop.example")).toBe(true);
    expect(hasExpectedOrigin(new Request("https://shop.example/api"), "https://shop.example")).toBe(false);
    expect(hasExpectedOrigin(new Request("https://shop.example/api", { headers: { origin: "https://evil.example" } }), "https://shop.example")).toBe(false);
    expect(hasExpectedOrigin(new Request("https://shop.example/api", { headers: { origin: "https://shop.example/path" } }), "https://shop.example")).toBe(false);
  });

  it("enforces byte limits even when Content-Length is absent", async () => {
    await expect(readBoundedText(new Request("https://shop.example/api", { method: "POST", body: "éé" }), 3)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    await expect(readBoundedText(new Request("https://shop.example/api", { method: "POST", body: "ok" }), 2)).resolves.toBe("ok");
  });
});

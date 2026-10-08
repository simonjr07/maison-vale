import { isIP } from "node:net";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The request body is too large.");
    this.name = "RequestBodyTooLargeError";
  }
}

type RequestEnvironment = {
  APP_URL?: string;
  NODE_ENV?: string;
  TRUST_PROXY_HEADERS?: string;
  VERCEL?: string;
};

function normalizeIp(value: string | null) {
  const first = value?.split(",")[0]?.trim();
  if (!first || first.length > 128) return null;
  if (isIP(first)) return first;

  const bracketed = first.match(/^\[([^\]]+)](?::\d+)?$/)?.[1];
  if (bracketed && isIP(bracketed)) return bracketed;

  const ipv4WithPort = first.match(/^([^:]+):\d+$/)?.[1];
  return ipv4WithPort && isIP(ipv4WithPort) ? ipv4WithPort : null;
}

export function getTrustedRequestSource(
  headers: Headers,
  environment: RequestEnvironment = process.env,
) {
  if (environment.VERCEL === "1") {
    return normalizeIp(headers.get("x-vercel-forwarded-for")) ?? "unavailable";
  }

  if (
    environment.NODE_ENV !== "production" ||
    environment.TRUST_PROXY_HEADERS === "true"
  ) {
    return (
      normalizeIp(headers.get("x-forwarded-for")) ??
      normalizeIp(headers.get("x-real-ip")) ??
      "unavailable"
    );
  }

  return "unavailable";
}

export function getApplicationOrigin(
  requestUrl: string,
  environment: RequestEnvironment = process.env,
) {
  const configured = environment.APP_URL?.trim();
  if (!configured && environment.NODE_ENV === "production") return null;

  try {
    const url = new URL(configured || requestUrl);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    if (environment.NODE_ENV === "production" && url.protocol !== "https:") {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function hasExpectedOrigin(request: Request, expectedOrigin: string) {
  const supplied = request.headers.get("origin");
  return supplied === expectedOrigin;
}

export async function readBoundedText(request: Request, maximumBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

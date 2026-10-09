const HTTP_REDIRECT_STATUSES = new Set([302, 303, 307, 308]);
const PROTECTED_ADMIN_MARKERS = [
  "Admin navigation",
  "Business overview",
  "Signed in as",
  "Catalogue management",
  "Fulfillment operations",
] as const;

export type AdminBoundaryResult =
  | { secure: true; mode: "http-redirect" | "streamed-redirect" }
  | { secure: false; reason: string };

type AdminBoundaryResponse = {
  status: number;
  location: string | null;
  contentType: string | null;
  cacheControl: string | null;
  body: string;
  origin: string;
};

function isLoginDestination(value: string, origin: string) {
  try {
    const target = new URL(value, origin);
    return target.origin === origin && target.pathname === "/admin/login";
  } catch {
    return false;
  }
}

function metaRefreshDestinations(body: string) {
  const destinations: string[] = [];
  const tags = body.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    if (attributes.get("http-equiv")?.toLowerCase() !== "refresh") continue;
    const destination = attributes.get("content")?.match(/^\s*\d+(?:\.\d+)?\s*;\s*url\s*=\s*(.+?)\s*$/i)?.[1];
    if (destination) destinations.push(destination.replace(/^['"]|['"]$/g, ""));
  }

  return destinations;
}

function streamedRedirectDestinations(body: string) {
  const destinations = [...body.matchAll(/NEXT_REDIRECT;(?:replace|push);([^;\r\n]+);(?:303|307|308);/g)]
    .map((match) => match[1]);
  destinations.push(...metaRefreshDestinations(body));
  return destinations;
}

export function inspectUnauthenticatedAdminResponse(response: AdminBoundaryResponse): AdminBoundaryResult {
  if (HTTP_REDIRECT_STATUSES.has(response.status)) {
    if (!response.location || !isLoginDestination(response.location, response.origin)) {
      return { secure: false, reason: "The admin response redirected somewhere other than the same-origin login page." };
    }
    return { secure: true, mode: "http-redirect" };
  }

  if (response.status !== 200 || !response.contentType?.toLowerCase().includes("text/html")) {
    return { secure: false, reason: `The admin boundary returned unsupported HTTP ${response.status}.` };
  }

  const cacheControl = response.cacheControl?.toLowerCase() ?? "";
  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    return { secure: false, reason: "The streamed admin response is not protected by a private, no-store cache policy." };
  }

  const exposedMarker = PROTECTED_ADMIN_MARKERS.find((marker) => response.body.includes(marker));
  if (exposedMarker) {
    return { secure: false, reason: "The unauthenticated response contains protected admin presentation content." };
  }

  const destinations = streamedRedirectDestinations(response.body);
  if (destinations.length === 0 || destinations.some((value) => !isLoginDestination(value, response.origin))) {
    return { secure: false, reason: "The HTTP 200 admin stream does not contain an exclusive login redirect control record." };
  }

  return { secure: true, mode: "streamed-redirect" };
}

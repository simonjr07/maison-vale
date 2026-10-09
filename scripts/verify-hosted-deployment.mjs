import { CATALOGUE_IMAGE_ASSETS } from "../src/catalogue/image-assets.ts";
import { inspectUnauthenticatedAdminResponse } from "../src/operations/hosted-admin-boundary.ts";

const argument = process.argv.find((value) => value.startsWith("--url="));
const configuredUrl = argument?.slice("--url=".length) || process.env.HOSTED_QA_URL;

if (!configuredUrl) throw new Error("Provide the public deployment with --url=https://host or HOSTED_QA_URL.");

const origin = new URL(configuredUrl).origin;
if (!origin.startsWith("https://")) throw new Error("Hosted QA requires a public HTTPS origin.");

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", ...init });
  verify(response.status !== 401 && response.status !== 403, `${path} is blocked by deployment protection or authorization.`);
  return response;
}

const home = await request("/");
verify(home.status === 200, `Homepage returned HTTP ${home.status}.`);
verify(home.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), "Homepage CSP is missing the framing restriction.");
verify(home.headers.get("x-frame-options") === "DENY", "Homepage frame policy is missing.");
verify(home.headers.get("x-content-type-options") === "nosniff", "Homepage MIME-sniffing protection is missing.");
verify(home.headers.has("strict-transport-security"), "Production HSTS is missing.");
verify(!home.headers.has("x-powered-by"), "Framework disclosure header is present.");

for (const path of ["/shop", "/cart", "/checkout", "/orders"]) {
  const response = await request(path);
  verify(response.status === 200, `${path} returned HTTP ${response.status}.`);
}

for (const path of ["/cart", "/checkout", "/orders"]) {
  const response = await request(path);
  verify(response.headers.get("x-robots-tag")?.includes("noindex"), `${path} is missing its noindex response policy.`);
  verify(response.headers.get("cache-control")?.includes("no-store"), `${path} is missing its private no-store policy.`);
}

const admin = await request("/admin");
const adminBody = await admin.text();
const adminBoundary = inspectUnauthenticatedAdminResponse({
  status: admin.status,
  location: admin.headers.get("location"),
  contentType: admin.headers.get("content-type"),
  cacheControl: admin.headers.get("cache-control"),
  body: adminBody,
  origin,
});
verify(adminBoundary.secure, adminBoundary.secure ? "" : adminBoundary.reason);
verify(admin.headers.get("x-robots-tag")?.includes("noindex"), "Admin response is missing noindex.");

const robots = await request("/robots.txt");
verify(robots.status === 200, `robots.txt returned HTTP ${robots.status}.`);
const robotsText = await robots.text();
for (const path of ["/admin", "/api", "/cart", "/checkout", "/orders"]) {
  verify(robotsText.includes(`Disallow: ${path}`), `robots.txt does not exclude ${path}.`);
}

const sitemap = await request("/sitemap.xml");
verify(sitemap.status === 200, `sitemap.xml returned HTTP ${sitemap.status}.`);
const sitemapText = await sitemap.text();
verify(!/\/(admin|api|cart|checkout|orders)(?:\/|<)/.test(sitemapText), "The sitemap exposes a protected or transactional route.");
const publicUrls = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
verify(publicUrls.length >= 14, "The sitemap does not contain the expected storefront, collection, and product URLs.");

for (const url of publicUrls) {
  verify(url.origin === origin, `The sitemap contains a URL outside ${origin}.`);
  const response = await request(`${url.pathname}${url.search}`);
  verify(response.status === 200, `${url.pathname} returned HTTP ${response.status}.`);
}

const imagePaths = [
  ...CATALOGUE_IMAGE_ASSETS.map((asset) => asset.url),
  "/catalogue/photography/maison-vale-editorial-hero.webp",
];
for (const path of imagePaths) {
  const optimized = `/_next/image?url=${encodeURIComponent(path)}&w=640&q=75`;
  const response = await request(optimized);
  verify(response.status === 200 && response.headers.get("content-type")?.startsWith("image/"), `Image optimization failed for ${path}.`);
}

for (const path of ["/api/orders/lookup", "/api/stripe/checkout-session"]) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    redirect: "manual",
  });
  verify(response.status === 403, `${path} did not reject a request without an Origin header.`);
}

console.log(`Hosted read-only QA passed for ${origin}: public routes, indexing boundaries, security headers, images, admin access boundary, and missing-Origin rejection.`);
console.log("Stripe Checkout, webhook delivery, authenticated admin behavior, cookies, logs, accessibility, and responsive presentation still require manual QA.");

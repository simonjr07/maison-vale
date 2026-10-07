import "dotenv/config";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { hashPassword } from "../src/server/auth/password.ts";

const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const email = "auth-verification@maison-vale.invalid";
const password = randomBytes(24).toString("base64url");
const testSource = `203.0.113.${randomBytes(1)[0] || 1}`;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const cookies = new Map();
let verificationStage = "setup";

function collectCookies(response) {
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(";", 1);
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    const cookieValue = pair.slice(separator + 1);
    if (cookieValue) cookies.set(name, cookieValue);
    else cookies.delete(name);
  }
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-forwarded-for", testSource);
  if (cookies.size) {
    headers.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  collectCookies(response);
  return response;
}

async function csrfToken() {
  const response = await request("/api/auth/csrf");
  assert.equal(response.status, 200);
  return (await response.json()).csrfToken;
}

async function credentialSignIn(candidatePassword) {
  const token = await csrfToken();
  return request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: token,
      email,
      password: candidatePassword,
      callbackUrl: `${baseUrl}/admin`,
    }),
  });
}

async function assertRedirectedToLogin(response) {
  if ([302, 303, 307, 308].includes(response.status)) {
    assert.equal(new URL(response.headers.get("location")).pathname, "/admin/login");
    return;
  }

  assert.equal(response.status, 200);
  const body = await response.text();
  assert.doesNotMatch(body, /The operations foundation is ready/i);
  assert.match(body, /\/admin\/login/);
}

async function main() {
  verificationStage = "temporary user setup";
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", active: true },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  verificationStage = "invalid credential response";
  const invalid = await credentialSignIn("a-valid-but-wrong-password");
  assert.equal(invalid.status, 302);
  assert.match(invalid.headers.get("location") ?? "", /CredentialsSignin/);

  verificationStage = "valid credential response";
  const valid = await credentialSignIn(password);
  assert.equal(valid.status, 302);
  assert.equal(new URL(valid.headers.get("location")).pathname, "/admin");

  verificationStage = "protected admin access";
  const protectedPage = await request("/admin");
  assert.equal(protectedPage.status, 200);

  verificationStage = "inactive user enforcement";
  await prisma.user.update({ where: { email }, data: { active: false } });
  const inactivePage = await request("/admin");
  await assertRedirectedToLogin(inactivePage);

  verificationStage = "staff shell access";
  await prisma.user.update({ where: { email }, data: { active: true, role: "STAFF" } });
  const staffPage = await request("/admin");
  assert.equal(staffPage.status, 200);

  verificationStage = "sign out";
  const token = await csrfToken();
  const signedOut = await request("/api/auth/signout", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: token, callbackUrl: `${baseUrl}/admin/login` }),
  });
  assert.ok([302, 303].includes(signedOut.status));

  verificationStage = "post-sign-out protection";
  const afterSignOut = await request("/admin");
  await assertRedirectedToLogin(afterSignOut);

  console.log("Admin authentication integration verification passed.");
}

main()
  .catch((error) => {
    console.error(`Admin authentication integration verification failed during ${verificationStage}.`);
    if (error instanceof assert.AssertionError) {
      console.error(`Expected ${String(error.expected)}, received ${String(error.actual)}.`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user.updateMany({ where: { email }, data: { active: false, role: "ADMIN" } });
    await prisma.$disconnect();
  });

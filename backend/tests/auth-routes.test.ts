import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const backendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerEntry = resolve(backendDirectory, "node_modules", "wrangler", "bin", "wrangler.js");

let worker: ChildProcess | undefined;
let persistenceDirectory: string | undefined;
let baseUrl = "";
let workerOutput = "";

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine a free port.");
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitForWorker(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Wrangler exited before becoming ready.\n${workerOutput}`);
    }
    try {
      const response = await fetch(`${url}/api/v1/auth/session`);
      if (response.status !== 401) {
        throw new Error(`Worker readiness request returned HTTP ${response.status}.\n${workerOutput}`);
      }
      return;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Worker readiness")) throw error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for Wrangler.\n${workerOutput}`);
}

function jsonRequest(path: string, method: string, body?: unknown, token?: string): Promise<Response> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("authentication routes with local D1", () => {
  beforeAll(async () => {
    persistenceDirectory = await mkdtemp(join(tmpdir(), "student-finance-auth-routes-"));
    const localEnvironment = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
    execFileSync(process.execPath, [
      wranglerEntry,
      "d1",
      "migrations",
      "apply",
      "student-finance-auth",
      "--local",
      "--persist-to",
      persistenceDirectory,
    ], { cwd: backendDirectory, env: localEnvironment, stdio: "pipe" });

    const port = await availablePort();
    baseUrl = `http://127.0.0.1:${port}`;
    worker = spawn(process.execPath, [
      wranglerEntry,
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--persist-to",
      persistenceDirectory,
      "--show-interactive-dev-session=false",
    ], { cwd: backendDirectory, env: localEnvironment, stdio: ["ignore", "pipe", "pipe"] });
    worker.stdout?.on("data", (chunk: Buffer) => { workerOutput = `${workerOutput}${chunk}`.slice(-4000); });
    worker.stderr?.on("data", (chunk: Buffer) => { workerOutput = `${workerOutput}${chunk}`.slice(-4000); });
    await waitForWorker(baseUrl, worker);
  }, 60_000);

  afterAll(async () => {
    if (worker && worker.exitCode === null && worker.signalCode === null) {
      worker.kill();
      await Promise.race([
        new Promise<void>((resolveExit) => worker?.once("exit", () => resolveExit())),
        new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 3000)),
      ]);
      if (worker.exitCode === null && worker.signalCode === null) {
        worker.kill("SIGKILL");
        await new Promise<void>((resolveExit) => worker?.once("exit", () => resolveExit()));
      }
    }
    if (persistenceDirectory) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          await rm(persistenceDirectory, { recursive: true, force: true });
          break;
        } catch (error) {
          const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
          if ((code !== "EBUSY" && code !== "EPERM") || attempt === 19) throw error;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
        }
      }
    }
  }, 10_000);

  it("rejects session and profile operations without authentication", async () => {
    const session = await jsonRequest("/api/v1/auth/session", "GET");
    const profile = await jsonRequest("/api/v1/me/profile", "GET");
    const update = await jsonRequest("/api/v1/me/profile", "PATCH", { displayName: "No session" });
    const logout = await jsonRequest("/api/v1/auth/logout", "POST");
    const transactions = await jsonRequest("/api/v1/me/transactions", "GET");

    expect(session.status).toBe(401);
    expect(profile.status).toBe(401);
    expect(update.status).toBe(401);
    expect(logout.status).toBe(401);
    expect(transactions.status).toBe(401);
  });

  it("registers, rejects duplicate email and invalid credentials, and supports login, profile, and logout", async () => {
    const email = `route-test-${crypto.randomUUID()}@example.test`;
    const password = "local route test password";
    const registration = await jsonRequest("/api/v1/auth/register", "POST", {
      email,
      password,
      displayName: "Route Test",
    });
    expect(registration.status).toBe(201);
    const registrationBody = await registration.json() as {
      data: { token: string; user: { email: string; displayName: string; currencyCode: string } };
    };
    expect(registrationBody.data.user).toMatchObject({
      email,
      displayName: "Route Test",
      currencyCode: "INR",
    });
    expect(registrationBody.data.token).toBeTruthy();

    const duplicate = await jsonRequest("/api/v1/auth/register", "POST", {
      email: email.toUpperCase(),
      password,
      displayName: "Duplicate",
    });
    expect(duplicate.status).toBe(409);

    const invalidCredentials = await jsonRequest("/api/v1/auth/login", "POST", {
      email,
      password: "incorrect password",
    });
    expect(invalidCredentials.status).toBe(401);

    const login = await jsonRequest("/api/v1/auth/login", "POST", { email, password });
    expect(login.status).toBe(200);
    const loginBody = await login.json() as { data: { token: string } };
    const token = loginBody.data.token;
    expect(token).toBeTruthy();

    const session = await jsonRequest("/api/v1/auth/session", "GET", undefined, token);
    expect(session.status).toBe(200);
    expect((await session.json() as { data: { user: { email: string } } }).data.user.email).toBe(email);

    const profile = await jsonRequest("/api/v1/me/profile", "GET", undefined, token);
    expect(profile.status).toBe(200);
    expect((await profile.json() as { data: { user: { displayName: string } } }).data.user.displayName).toBe("Route Test");

    const update = await jsonRequest("/api/v1/me/profile", "PATCH", {
      displayName: "Updated Route Test",
      currencyCode: "USD",
      timezone: "America/New_York",
    }, token);
    expect(update.status).toBe(200);
    expect((await update.json() as {
      data: { user: { displayName: string; currencyCode: string; timezone: string } };
    }).data.user).toMatchObject({
      displayName: "Updated Route Test",
      currencyCode: "USD",
      timezone: "America/New_York",
    });

    const income = {
      type: "income",
      amount: 2000,
      category: "Scholarship",
      description: "Merit award",
      date: "2026-09-27",
      paymentMethod: "Bank transfer",
      notes: "Fall semester",
      recurrence: "yearly",
    };
    const savedIncome = await jsonRequest("/api/v1/me/transactions/txn-income-1", "PUT", income, token);
    expect(savedIncome.status).toBe(200);
    expect((await savedIncome.json() as { data: { transaction: Record<string, unknown> } }).data.transaction)
      .toMatchObject({ id: "txn-income-1", ...income });

    const invalidDate = await jsonRequest("/api/v1/me/transactions/txn-invalid", "PUT", { ...income, date: "2026-02-30" }, token);
    expect(invalidDate.status).toBe(400);

    const updatedIncome = await jsonRequest("/api/v1/me/transactions/txn-income-1", "PUT", {
      ...income,
      amount: 2500,
      date: "2026-10-01",
      category: "Family support",
      recurrence: null,
    }, token);
    expect(updatedIncome.status).toBe(200);
    const listed = await jsonRequest("/api/v1/me/transactions", "GET", undefined, token);
    expect((await listed.json() as { data: { transactions: Array<Record<string, unknown>> } }).data.transactions)
      .toEqual([expect.objectContaining({ amount: 2500, date: "2026-10-01", category: "Family support" })]);

    const otherRegistration = await jsonRequest("/api/v1/auth/register", "POST", {
      email: `other-${crypto.randomUUID()}@example.test`,
      password,
      displayName: "Other User",
    });
    const otherToken = (await otherRegistration.json() as { data: { token: string } }).data.token;
    const otherTransactions = await jsonRequest("/api/v1/me/transactions", "GET", undefined, otherToken);
    expect((await otherTransactions.json() as { data: { transactions: unknown[] } }).data.transactions).toEqual([]);

    const deleted = await jsonRequest("/api/v1/me/transactions/txn-income-1", "DELETE", undefined, token);
    expect(deleted.status).toBe(200);
    const afterDelete = await jsonRequest("/api/v1/me/transactions", "GET", undefined, token);
    expect((await afterDelete.json() as { data: { transactions: unknown[] } }).data.transactions).toEqual([]);

    const logout = await jsonRequest("/api/v1/auth/logout", "POST", undefined, token);
    expect(logout.status).toBe(200);
    const expiredSession = await jsonRequest("/api/v1/auth/session", "GET", undefined, token);
    const expiredProfile = await jsonRequest("/api/v1/me/profile", "GET", undefined, token);
    expect(expiredSession.status).toBe(401);
    expect(expiredProfile.status).toBe(401);
  });
});
import { createOpaqueToken, hashPassword, isOpaqueToken, sha256Hex, verifyPassword } from "./security";
import { passwordResetDelivery } from "./password-reset-delivery";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_LIFETIME_MS = 30 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const DUMMY_PASSWORD_HASH = `pbkdf2-sha256$600000$${"A".repeat(22)}$${"A".repeat(43)}`;

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

type JsonRecord = Record<string, unknown>;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  currency_code: string;
  timezone: string;
};

type SessionRow = UserRow & { session_id: string; expires_at: string };

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function publicUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    currencyCode: row.currency_code,
    timezone: row.timezone,
  };
}

function requireRecord(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }
  return value as JsonRecord;
}

async function readBody(request: Request): Promise<JsonRecord> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new HttpError(413, "BODY_TOO_LARGE", "Request body is too large.");

  let value: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      throw new HttpError(413, "BODY_TOO_LARGE", "Request body is too large.");
    }
    value = JSON.parse(raw);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
  return requireRecord(value);
}

function requiredString(body: JsonRecord, key: string, min: number, max: number): string {
  const value = body[key];
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new HttpError(400, "INVALID_INPUT", `Invalid ${key}.`);
  }
  return value;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "INVALID_INPUT", "Enter a valid email address.");
  }
  return email;
}

function validatePassword(value: string): string {
  if (value.length < 12 || value.length > 128) {
    throw new HttpError(400, "INVALID_INPUT", "Password must be between 12 and 128 characters.");
  }
  return value;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function enforceRateLimit(
  env: Env,
  request: Request,
  endpoint: string,
  subject: string | undefined,
  maximumAttempts: number,
): Promise<void> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const identities = [`${endpoint}:ip:${ip}`];
  if (subject) identities.push(`${endpoint}:subject:${subject}`);

  const now = Date.now();
  const startedAt = new Date(now).toISOString();
  const expiredWindow = new Date(now - RATE_WINDOW_MS).toISOString();
  const expiresAt = new Date(now + RATE_WINDOW_MS).toISOString();

  for (const identity of identities) {
    const bucketHash = await sha256Hex(identity);
    const bucket = await env.DB.prepare(
      `INSERT INTO auth_rate_limits (bucket_hash, attempts, window_started_at, expires_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(bucket_hash) DO UPDATE SET
         attempts = CASE WHEN auth_rate_limits.window_started_at <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
         window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END,
         expires_at = excluded.expires_at
       RETURNING attempts`,
    )
      .bind(bucketHash, startedAt, expiresAt, expiredWindow, expiredWindow)
      .first<{ attempts: number }>();

    if (!bucket || bucket.attempts > maximumAttempts) {
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Try again later.");
    }
  }
}

async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = createOpaqueToken();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), userId, await sha256Hex(token), createdAt, expiresAt, createdAt)
    .run();
  return { token, expiresAt };
}

async function getAuthenticatedSession(request: Request, env: Env): Promise<SessionRow> {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);
  if (!match) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");

  const tokenHash = await sha256Hex(match[1]);
  const now = nowIso();
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.password_hash,
            p.display_name, p.currency_code, p.timezone
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<SessionRow>();

  if (!row) throw new HttpError(401, "UNAUTHORIZED", "Session is invalid or expired.");
  await env.DB.prepare("UPDATE sessions SET last_used_at = ? WHERE id = ? AND user_id = ?")
    .bind(now, row.session_id, row.id)
    .run();
  return row;
}

async function register(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const email = normalizeEmail(requiredString(body, "email", 3, 254));
  const password = validatePassword(requiredString(body, "password", 12, 128));
  const displayName = requiredString(body, "displayName", 1, 80).trim();
  if (!displayName) throw new HttpError(400, "INVALID_INPUT", "Display name is required.");

  await enforceRateLimit(env, request, "register", undefined, 8);
  const userId = crypto.randomUUID();
  const now = nowIso();
  const passwordHash = await hashPassword(password);

  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(userId, email, passwordHash, now, now),
      env.DB.prepare(
        "INSERT INTO profiles (user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ).bind(userId, displayName, now, now),
    ]);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: users\.email/i.test(error.message)) {
      throw new HttpError(409, "EMAIL_UNAVAILABLE", "Unable to register with those details.");
    }
    throw error;
  }

  const session = await createSession(env, userId);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, p.display_name, p.currency_code, p.timezone
     FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
  )
    .bind(userId)
    .first<UserRow>();
  if (!row) throw new Error("New user profile was not persisted.");

  return response({ data: { token: session.token, expiresAt: session.expiresAt, user: publicUser(row) } }, 201);
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const email = normalizeEmail(requiredString(body, "email", 3, 254));
  const password = requiredString(body, "password", 1, 128);
  await enforceRateLimit(env, request, "login", email, 10);

  const user = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, p.display_name, p.currency_code, p.timezone
     FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.email = ?`,
  )
    .bind(email)
    .first<UserRow>();
  const validPassword = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user || !validPassword) throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");

  const session = await createSession(env, user.id);
  return response({ data: { token: session.token, expiresAt: session.expiresAt, user: publicUser(user) } });
}

async function currentSession(request: Request, env: Env): Promise<Response> {
  const session = await getAuthenticatedSession(request, env);
  return response({
    data: {
      user: publicUser(session),
      session: { expiresAt: session.expires_at },
    },
  });
}

async function logout(request: Request, env: Env): Promise<Response> {
  const session = await getAuthenticatedSession(request, env);
  const now = nowIso();
  await env.DB.prepare(
    "UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
  )
    .bind(now, session.session_id, session.id)
    .run();
  return response({ data: { loggedOut: true } });
}

async function updateProfile(request: Request, env: Env, session: SessionRow): Promise<Response> {
  const body = await readBody(request);
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !["displayName", "currencyCode", "timezone"].includes(key))) {
    throw new HttpError(400, "INVALID_INPUT", "Provide one or more supported profile fields.");
  }

  const values: Array<[string, string]> = [];
  if ("displayName" in body) {
    const displayName = requiredString(body, "displayName", 1, 80).trim();
    if (!displayName) throw new HttpError(400, "INVALID_INPUT", "Display name is required.");
    values.push(["display_name", displayName]);
  }
  if ("currencyCode" in body) {
    const currency = requiredString(body, "currencyCode", 3, 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, "INVALID_INPUT", "Invalid currency code.");
    values.push(["currency_code", currency]);
  }
  if ("timezone" in body) {
    const timezone = requiredString(body, "timezone", 1, 80);
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      throw new HttpError(400, "INVALID_INPUT", "Invalid timezone.");
    }
    values.push(["timezone", timezone]);
  }

  const assignments = [...values.map(([column]) => `${column} = ?`), "updated_at = ?"].join(", ");
  await env.DB.prepare(`UPDATE profiles SET ${assignments} WHERE user_id = ?`)
    .bind(...values.map(([, value]) => value), nowIso(), session.id)
    .run();
  return response({ data: { user: await loadUser(env, session.id) } });
}

async function loadUser(env: Env, userId: string): Promise<ReturnType<typeof publicUser>> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.password_hash, p.display_name, p.currency_code, p.timezone
     FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
  )
    .bind(userId)
    .first<UserRow>();
  if (!row) throw new HttpError(404, "USER_NOT_FOUND", "User profile was not found.");
  return publicUser(row);
}

async function requestPasswordReset(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const email = normalizeEmail(requiredString(body, "email", 3, 254));
  await enforceRateLimit(env, request, "password-reset", email, 5);

  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  if (user) {
    const token = createOpaqueToken();
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + RESET_LIFETIME_MS).toISOString();
    const tokenId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(tokenId, user.id, await sha256Hex(token), createdAt, expiresAt)
      .run();

    const resetUrl = new URL(env.RESET_LINK_BASE);
    resetUrl.searchParams.set("token", token);
    try {
      await passwordResetDelivery.send({ recipient: email, resetUrl: resetUrl.toString(), expiresAt });
    } catch {
      // Keep this response indistinguishable when delivery is unavailable.
    }
  }

  return response({
    data: { message: "If an account exists, reset instructions will be available when delivery is configured." },
  }, 202);
}

async function confirmPasswordReset(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const token = requiredString(body, "token", 43, 43);
  const password = validatePassword(requiredString(body, "newPassword", 12, 128));
  if (!isOpaqueToken(token)) throw new HttpError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired.");

  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const record = await env.DB.prepare(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<{ id: string; user_id: string }>();
  if (!record) throw new HttpError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired.");

  const passwordHash = await hashPassword(password);
  const result = await env.DB.batch([
    env.DB.prepare(
      `UPDATE users SET password_hash = ?, updated_at = ?
       WHERE id = ? AND EXISTS (
         SELECT 1 FROM password_reset_tokens
         WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?
       )`,
    ).bind(passwordHash, now, record.user_id, record.id, record.user_id, now),
    env.DB.prepare(
      `UPDATE password_reset_tokens SET used_at = ?
       WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?`,
    ).bind(now, record.id, record.user_id, now),
    env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
      .bind(now, record.user_id),
  ]);

  if (result[0].meta.changes !== 1) {
    throw new HttpError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired.");
  }
  return response({ data: { passwordChanged: true } });
}

export async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/v1/auth/register" && request.method === "POST") return register(request, env);
  if (pathname === "/api/v1/auth/login" && request.method === "POST") return login(request, env);
  if (pathname === "/api/v1/auth/logout" && request.method === "POST") return logout(request, env);
  if (pathname === "/api/v1/auth/session" && request.method === "GET") return currentSession(request, env);
  if (pathname === "/api/v1/auth/password-reset/request" && request.method === "POST") {
    return requestPasswordReset(request, env);
  }
  if (pathname === "/api/v1/auth/password-reset/confirm" && request.method === "POST") {
    return confirmPasswordReset(request, env);
  }
  if (pathname === "/api/v1/me/profile" && request.method === "GET") {
    const session = await getAuthenticatedSession(request, env);
    return response({ data: { user: publicUser(session) } });
  }
  if (pathname === "/api/v1/me/profile" && request.method === "PATCH") {
    const session = await getAuthenticatedSession(request, env);
    return updateProfile(request, env, session);
  }
  throw new HttpError(404, "NOT_FOUND", "Endpoint not found.");
}
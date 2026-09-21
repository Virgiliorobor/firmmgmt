import { and, eq, isNull } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { Secret, TOTP } from "otpauth";
import type { AppDb } from "@/modules/db";
import { sessions, totpCredentials, users } from "@/modules/db/schema";
import { newId, nowUtc, type Person, type UserRole } from "@/modules/db/ids";
import type { AppEnv } from "@/modules/db/env";
import type { EventBus } from "@/modules/event-bus";
import type { RateLimit } from "@/modules/rate-limit";
import { decryptField, emailHash, encryptField } from "./crypto-field";
import { signSessionCookie, type SessionCookiePayload } from "./cookie";
import { handleMicrosoftCallback, startMicrosoftLogin } from "./microsoft";

const ARGON = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export const CREDENTIALS_UNRECOGNIZED = "Those credentials were not recognized. Try again.";
export const MFA_FAILED = "Authenticator code failed. Try again.";
export const ACCOUNT_DEACTIVATED = "This account is deactivated.";
export const ACCOUNT_LOCKED = "This account is locked. Try again later.";

type Challenge = { userId: string; expiresAt: number };

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new AuthError("Password must be at least 12 characters.", 400);
  }
  return hash(password, ARGON);
}

function totpFor(secretBase32: string, label: string, issuer: string): TOTP {
  return new TOTP({
    issuer,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function createAuth(options: {
  getDb: () => AppDb;
  bus: EventBus;
  rateLimit: RateLimit;
  env: AppEnv;
}) {
  const challenges = new Map<string, Challenge>();

  async function emit(
    tx: AppDb,
    type: string,
    actorId: string | null,
    requestId: string,
    payload: Record<string, unknown>,
  ) {
    return options.bus.emitInTx(tx, { type, source: "auth", actorId, requestId, payload });
  }

  async function findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const rows = await options.getDb().select().from(users).where(eq(users.email, normalized));
    return rows[0] ?? null;
  }

  async function startTotpLogin(input: {
    email: string;
    password: string;
    ip: string;
    requestId: string;
  }): Promise<{ challenge_id: string }> {
    const ipLimit = await options.rateLimit.hit(`login-ip:${input.ip}`);
    const userLimit = await options.rateLimit.hit(`login-user:${input.email.trim().toLowerCase()}`);
    if (!ipLimit.allowed || !userLimit.allowed) {
      throw new AuthError("Too many sign-in attempts. Try again in a minute.", 429);
    }

    const user = await findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      await options.bus.dispatchEnvelope({
        id: newId(),
        type: "user.auth_failed",
        at: nowUtc().toISOString(),
        source: "auth",
        request_id: input.requestId,
        actor_id: null,
        payload: { email_hash: emailHash(input.email), reason: "unrecognized" },
        version: 1,
      });
      throw new AuthError(CREDENTIALS_UNRECOGNIZED, 401);
    }
    if (await options.rateLimit.isLocked(user.id)) {
      throw new AuthError(ACCOUNT_LOCKED, 429);
    }
    if (!user.isActive) {
      throw new AuthError(ACCOUNT_DEACTIVATED, 401);
    }
    const passwordOk = await verify(user.passwordHash, input.password);
    if (!passwordOk) {
      await options.rateLimit.recordFailure(user.id, emailHash(user.email));
      await options.bus.dispatchEnvelope({
        id: newId(),
        type: "user.auth_failed",
        at: nowUtc().toISOString(),
        source: "auth",
        request_id: input.requestId,
        actor_id: user.id,
        payload: { email_hash: emailHash(user.email), reason: "unrecognized" },
        version: 1,
      });
      throw new AuthError(CREDENTIALS_UNRECOGNIZED, 401);
    }
    const challengeId = newId();
    challenges.set(challengeId, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { challenge_id: challengeId };
  }

  async function verifyTotp(input: {
    challengeId?: string;
    email?: string;
    password?: string;
    code: string;
    ip: string;
    userAgent: string;
    requestId: string;
  }): Promise<{ cookieValue: string; person: Person; sessionId: string; maxAge: number }> {
    let userId: string | undefined;
    if (input.challengeId) {
      const challenge = challenges.get(input.challengeId);
      if (!challenge || challenge.expiresAt < Date.now()) {
        throw new AuthError(MFA_FAILED, 401);
      }
      userId = challenge.userId;
      challenges.delete(input.challengeId);
    } else if (input.email && input.password) {
      const started = await startTotpLogin({
        email: input.email,
        password: input.password,
        ip: input.ip,
        requestId: input.requestId,
      });
      const challenge = challenges.get(started.challenge_id);
      userId = challenge?.userId;
      if (started.challenge_id) challenges.delete(started.challenge_id);
    }
    if (!userId) {
      throw new AuthError(CREDENTIALS_UNRECOGNIZED, 401);
    }

    const db = options.getDb();
    const userRows = await db.select().from(users).where(eq(users.id, userId));
    const user = userRows[0];
    if (!user || !user.isActive) {
      throw new AuthError(ACCOUNT_DEACTIVATED, 401);
    }
    const credRows = await db.select().from(totpCredentials).where(eq(totpCredentials.userId, user.id));
    const cred = credRows[0];
    if (!cred) {
      throw new AuthError(MFA_FAILED, 401);
    }
    const secret = decryptField(cred.secretEncrypted, options.env.fieldEncryptionKey);
    const totp = totpFor(secret, user.email, options.env.totpIssuer);
    const delta = totp.validate({ token: input.code.replaceAll(" ", ""), window: 1 });
    if (delta === null) {
      await options.rateLimit.recordFailure(user.id, emailHash(user.email));
      await options.bus.dispatchEnvelope({
        id: newId(),
        type: "user.auth_failed",
        at: nowUtc().toISOString(),
        source: "auth",
        request_id: input.requestId,
        actor_id: user.id,
        payload: { email_hash: emailHash(user.email), reason: "mfa_failed" },
        version: 1,
      });
      throw new AuthError(MFA_FAILED, 401);
    }

    const idleMs = options.env.sessionIdleHours * 60 * 60 * 1000;
    const sessionId = newId();
    const expiresAt = new Date(Date.now() + idleMs);
    const events: Awaited<ReturnType<typeof emit>>[] = [];

    await db.transaction(async (tx) => {
      await tx.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt,
        idleExpiresAt: expiresAt,
        revokedAt: null,
        userAgent: input.userAgent.slice(0, 500),
        createdAt: nowUtc(),
      });
      await tx
        .update(users)
        .set({ lastLoginAt: nowUtc(), updatedAt: nowUtc() })
        .where(eq(users.id, user.id));
      await tx
        .update(totpCredentials)
        .set({ lastUsedAt: nowUtc() })
        .where(eq(totpCredentials.id, cred.id));
      events.push(
        await emit(tx, "user.authenticated", user.id, input.requestId, {
          user_id: user.id,
          session_id: sessionId,
          role: user.role,
          expires_at: expiresAt.toISOString(),
          method: "totp",
        }),
      );
    });
    await options.rateLimit.clearFailures(user.id);
    await options.bus.dispatchPending();

    const payload: SessionCookiePayload = {
      sid: sessionId,
      uid: user.id,
      role: user.role,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const cookieValue = await signSessionCookie(payload, options.env.sessionSecret);
    return {
      cookieValue,
      sessionId,
      maxAge: Math.floor(idleMs / 1000),
      person: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role as UserRole,
        isActive: user.isActive,
      },
    };
  }

  async function loadSession(sessionId: string): Promise<Person | null> {
    const db = options.getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    const session = rows[0];
    if (!session || session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now() || session.idleExpiresAt.getTime() < Date.now()) {
      return null;
    }
    const userRows = await db.select().from(users).where(eq(users.id, session.userId));
    const user = userRows[0];
    if (!user || !user.isActive) return null;
    await db
      .update(sessions)
      .set({ idleExpiresAt: new Date(Date.now() + options.env.sessionIdleHours * 60 * 60 * 1000) })
      .where(eq(sessions.id, sessionId));
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as UserRole,
      isActive: user.isActive,
    };
  }

  async function listSessions(actor: Person, forUserId?: string) {
    const target = forUserId && (actor.role === "managing_partner" || actor.role === "administrative_manager" || actor.role === "integration_operator")
      ? forUserId
      : actor.id;
    if (target !== actor.id && actor.role === "lawyer_or_analyst") {
      throw new AuthError("You can only list your own sessions.", 403);
    }
    return options
      .getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, target), isNull(sessions.revokedAt)));
  }

  async function revokeSession(input: {
    actor: Person;
    sessionId: string;
    requestId: string;
    currentSessionId: string;
  }): Promise<{ signedOut: boolean }> {
    const db = options.getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.id, input.sessionId));
    const session = rows[0];
    if (!session) {
      throw new AuthError("Session not found.", 404);
    }
    const canRevokeAny =
      input.actor.role === "managing_partner" ||
      input.actor.role === "administrative_manager" ||
      input.actor.role === "integration_operator";
    if (session.userId !== input.actor.id && !canRevokeAny) {
      throw new AuthError("Session not found.", 404);
    }
    await db.transaction(async (tx) => {
      await tx.update(sessions).set({ revokedAt: nowUtc() }).where(eq(sessions.id, input.sessionId));
      await emit(tx, "user.session_revoked", input.actor.id, input.requestId, {
        session_id: input.sessionId,
        user_id: session.userId,
        revoked_by: input.actor.id,
      });
    });
    await options.bus.dispatchPending();
    return { signedOut: input.sessionId === input.currentSessionId };
  }

  async function logout(sessionId: string, actorId: string, requestId: string): Promise<void> {
    const db = options.getDb();
    await db.transaction(async (tx) => {
      await tx.update(sessions).set({ revokedAt: nowUtc() }).where(eq(sessions.id, sessionId));
      await emit(tx, "user.session_revoked", actorId, requestId, {
        session_id: sessionId,
        user_id: actorId,
        revoked_by: actorId,
      });
    });
    await options.bus.dispatchPending();
  }

  async function enrollTotpForUser(userId: string, secretBase32: string): Promise<void> {
    const db = options.getDb();
    await db.insert(totpCredentials).values({
      id: newId(),
      userId,
      secretEncrypted: encryptField(secretBase32, options.env.fieldEncryptionKey),
      enrolledAt: nowUtc(),
      lastUsedAt: null,
    });
  }

  return {
    startTotpLogin,
    verifyTotp,
    loadSession,
    listSessions,
    revokeSession,
    logout,
    enrollTotpForUser,
    findUserByEmail,
    startMicrosoftLogin,
    handleMicrosoftCallback,
    hashPassword,
  };
}

export type Auth = ReturnType<typeof createAuth>;

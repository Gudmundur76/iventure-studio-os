import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const SECRET = new TextEncoder().encode(ENV.cookieSecret || "iventure-secret-change-me");

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request) {
  // Parse cookies from header (no cookie-parser middleware)
  const cookieHeader = req.headers.cookie;
  const cookies = cookieHeader ? parseCookies(cookieHeader) : {};
  let token: string | undefined = cookies[COOKIE_NAME];

  // Fallback to Authorization header (Bearer token)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, userId)).limit(1);
  return result[0] ?? null;
}

export function registerLocalAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "username and password required" });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }
    const result = await db.select().from(users).where(eq(users.openId, username)).limit(1);
    const user = result[0];
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = await createSessionToken(user.openId);
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true, user: { openId: user.openId, name: user.name, role: user.role } });
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Setup endpoint — creates the admin user on first run (only if no users exist)
  app.post("/api/auth/setup", async (req: Request, res: Response) => {
    const { password } = req.body ?? {};
    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Setup already complete" });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      openId: "admin",
      name: "Gudmundur",
      role: "admin",
      passwordHash: hash,
      lastSignedIn: new Date(),
    });
    const token = await createSessionToken("admin");
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true });
  });
}

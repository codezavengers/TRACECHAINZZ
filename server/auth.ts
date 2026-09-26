import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import type { Role, UserProfile } from "../src/lib/types";
import { getUserById, getAllUsers, logAuditEvent } from "./db";

export interface AuthenticatedUser extends UserProfile {
  token?: string;
}

// In-memory token session mapping (Token -> AuthenticatedUser)
const sessionStore = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateToken(user: UserProfile): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "tracechain-secret-key-le-forensics";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      agency: user.agency,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const token = `${header}.${payload}.${signature}`;
  sessionStore.set(token, {
    user: { ...user, token },
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function verifyToken(token: string): AuthenticatedUser | null {
  if (!token) return null;

  // Check in-memory fast session first
  const session = sessionStore.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }

  // Cryptographic signature check
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, sig] = parts;
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "tracechain-secret-key-le-forensics";
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (expectedSig !== sig) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    const user: AuthenticatedUser = {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role as Role,
      department: decoded.department,
      agency: decoded.agency,
      token,
    };
    sessionStore.set(token, { user, expiresAt: (decoded.exp || Date.now() / 1000 + 3600) * 1000 });
    return user;
  } catch {
    return null;
  }
}

// Role Hierarchy: VIEWER (0) < ANALYST (1) < INVESTIGATOR (2) < ADMIN (3)
export const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  ANALYST: 1,
  INVESTIGATOR: 2,
  ADMIN: 3,
};

export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extracts user from Authorization header (Bearer <token>)
 * or from X-User-Id header (for developer / preview environment user switcher)
 */
export function authenticateUserMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Support direct user switcher header in development/law enforcement simulation
  const headerUserId = req.headers["x-user-id"] as string;
  if (headerUserId) {
    const dbUser = getUserById(headerUserId);
    if (dbUser) {
      req.user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        department: dbUser.department,
        agency: dbUser.agency,
        avatar: dbUser.avatar,
      };
      return next();
    }
  }

  // Fallback to default primary investigator in demo preview if no header passed
  const users = getAllUsers();
  const defaultUser = users[0];
  if (defaultUser) {
    req.user = {
      id: defaultUser.id,
      name: defaultUser.name,
      email: defaultUser.email,
      role: defaultUser.role,
      department: defaultUser.department,
      agency: defaultUser.agency,
      avatar: defaultUser.avatar,
    };
  }

  next();
}

/**
 * Server-side RBAC Guard Middleware
 */
export function requireRole(minimumRole: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "AUTHENTICATION_REQUIRED: Valid officer credentials or token must be supplied.",
      });
    }

    if (!hasRequiredRole(req.user.role, minimumRole)) {
      logAuditEvent(
        req.user.name,
        req.user.role,
        "LOGIN",
        "ACCESS_DENIED",
        req.path,
        {
          minimumRole,
          userRole: req.user.role,
          method: req.method,
        },
        req.ip
      );

      return res.status(403).json({
        success: false,
        error: `ACCESS_DENIED: Role '${req.user.role}' is insufficient. Required minimum authority: '${minimumRole}'.`,
      });
    }

    next();
  };
}

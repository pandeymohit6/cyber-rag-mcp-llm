import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';

export interface AuthUser {
  sub: string;
  tenantId: string;
  roles: string[];
}
declare global {
  namespace Express { interface Request { user?: AuthUser } }
}
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    req.user = jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISSUER }) as AuthUser;
    if (!req.user.tenantId || !req.user.sub) throw new Error('Invalid claims');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles?.some(r => roles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };

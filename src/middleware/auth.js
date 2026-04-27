import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { query } from '../config/db.js';

export const signToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const loadRoles = async (userId) => {
  const { rows } = await query(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.name);
};

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing token');

    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: decoded.sub,
      organizationId: decoded.org,
      email: decoded.email,
      roles: await loadRoles(decoded.sub),
    };
    next();
  } catch (err) {
    next(err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError'
      ? ApiError.unauthorized('Invalid or expired token')
      : err);
  }
};

/**
 * Authenticate if a Bearer token is present, but never reject. Useful for
 * endpoints that accept anonymous traffic but want to attribute logged-in
 * users when possible (e.g. analytics).
 */
export const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: decoded.sub,
      organizationId: decoded.org,
      email: decoded.email,
    };
  } catch {
    /* swallow — anonymous fallback */
  }
  next();
};

export const requireRole = (...allowed) => async (req, _res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const roles = req.user.roles?.length ? req.user.roles : await loadRoles(req.user.id);
    if (!roles.some((r) => allowed.includes(r))) {
      throw ApiError.forbidden('Insufficient role');
    }
    req.user.roles = roles;
    next();
  } catch (err) {
    next(err);
  }
};

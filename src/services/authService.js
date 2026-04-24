import bcrypt from 'bcrypt';
import { withTransaction, query } from '../config/db.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

export const registerOrgAndAdmin = async (input) => {
  const { organizationName, firstName, lastName, email, phone, password } = input;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) throw ApiError.conflict('Email already registered');

  const hash = await bcrypt.hash(password, env.bcryptRounds);

  return withTransaction(async (client) => {
    const orgRes = await client.query(
      `INSERT INTO organizations (name, contact_email, phone, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, 'starter', 'trial') RETURNING id, name`,
      [organizationName, email, phone || null],
    );
    const org = orgRes.rows[0];

    const userRes = await client.query(
      `INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, first_name, last_name`,
      [org.id, firstName, lastName, email, phone || null, hash],
    );
    const user = userRes.rows[0];

    const adminRoleRes = await client.query(
      `INSERT INTO roles (name) VALUES ('admin')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user.id, adminRoleRes.rows[0].id],
    );

    const token = signToken({ sub: user.id, org: org.id, email: user.email });
    return { token, user, organization: org };
  });
};

export const login = async ({ email, password }) => {
  const { rows } = await query(
    `SELECT id, organization_id, email, first_name, last_name, password_hash, is_active
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );
  const user = rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const token = signToken({
    sub: user.id,
    org: user.organization_id,
    email: user.email,
  });
  delete user.password_hash;
  return { token, user };
};

export const me = async (userId) => {
  const { rows } = await query(
    `SELECT u.id, u.organization_id, u.email, u.first_name, u.last_name, u.phone,
            COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId],
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  return rows[0];
};

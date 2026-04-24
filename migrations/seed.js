#!/usr/bin/env node
// Seed base roles, permissions and a demo organization + admin user.
import bcrypt from 'bcrypt';
import { pool, query, withTransaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

const ROLES = ['admin', 'school_manager', 'driver', 'parent'];
const PERMISSIONS = [
  'org.manage', 'bus.manage', 'route.manage',
  'trip.manage', 'gps.write', 'child.manage',
  'checkin.write', 'sos.trigger', 'analytics.read',
];

const ROLE_PERMS = {
  admin: PERMISSIONS,
  school_manager: ['bus.manage', 'route.manage', 'trip.manage', 'child.manage', 'analytics.read'],
  driver: ['gps.write', 'checkin.write', 'sos.trigger'],
  parent: ['sos.trigger'],
};

const seed = async () => {
  await withTransaction(async (c) => {
    for (const name of ROLES) {
      await c.query(
        `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name],
      );
    }
    for (const name of PERMISSIONS) {
      await c.query(
        `INSERT INTO permissions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name],
      );
    }
    for (const [role, perms] of Object.entries(ROLE_PERMS)) {
      const { rows: r } = await c.query('SELECT id FROM roles WHERE name = $1', [role]);
      const roleId = r[0].id;
      for (const p of perms) {
        const { rows: pr } = await c.query('SELECT id FROM permissions WHERE name = $1', [p]);
        await c.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [roleId, pr[0].id],
        );
      }
    }
  });

  // Demo org + admin (idempotent)
  const email = 'admin@ecobus.demo';
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash('Admin@1234', env.bcryptRounds);
    await withTransaction(async (c) => {
      const { rows: org } = await c.query(
        `INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status)
         VALUES ('Demo School', $1, 'starter', 'trial') RETURNING id`,
        [email],
      );
      const { rows: u } = await c.query(
        `INSERT INTO users (organization_id, first_name, last_name, email, password_hash)
         VALUES ($1, 'Demo', 'Admin', $2, $3) RETURNING id`,
        [org[0].id, email, hash],
      );
      const { rows: r } = await c.query(`SELECT id FROM roles WHERE name = 'admin'`);
      await c.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [u[0].id, r[0].id],
      );
    });
    logger.info(`Seeded demo admin: ${email} / Admin@1234`);
  } else {
    logger.info('Demo admin already exists, skipping.');
  }
};

seed()
  .then(() => logger.info('Seed complete'))
  .catch((err) => {
    logger.error('Seed failed', { err: err.message });
    process.exitCode = 1;
  })
  .finally(() => pool.end());

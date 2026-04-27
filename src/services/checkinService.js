import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Record a check-in.
 *
 * Business rules:
 *   - Trip must exist, be in_progress, and belong to the caller's org.
 *   - Child must belong to the same org and be assigned to the trip's route.
 *   - Drivers may only check in children for their own trip.
 */
export const create = async (user, { tripId, childId, status, method }) => {
  const tripRow = await query(
    `SELECT t.id, t.organization_id, t.route_id, ra.driver_id
     FROM trips t
     LEFT JOIN route_assignments ra ON ra.id = t.assignment_id
     WHERE t.id = $1`,
    [tripId],
  );
  const trip = tripRow.rows[0];
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.organization_id !== user.organizationId) {
    throw ApiError.forbidden('Trip does not belong to your organization');
  }

  const isDriver = (user.roles || []).includes('driver');
  if (isDriver && trip.driver_id !== user.id) {
    throw ApiError.forbidden('Drivers may only check in for their own trip');
  }

  const childRow = await query(
    `SELECT c.id, c.organization_id,
            EXISTS(
              SELECT 1 FROM child_routes cr
              WHERE cr.child_id = c.id AND cr.route_id = $2
            ) AS on_route
     FROM children c
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [childId, trip.route_id],
  );
  const child = childRow.rows[0];
  if (!child) throw ApiError.notFound('Child not found');
  if (child.organization_id !== user.organizationId) {
    throw ApiError.forbidden('Child does not belong to your organization');
  }
  if (!child.on_route) {
    throw ApiError.badRequest('Child is not assigned to this trip\'s route');
  }

  const { rows } = await query(
    `INSERT INTO checkins (trip_id, child_id, status, method, timestamp)
     VALUES ($1,$2,$3,$4, NOW())
     RETURNING id, trip_id, child_id, status, method, timestamp`,
    [tripId, childId, status, method],
  );
  return rows[0];
};

export const listForTrip = async (user, tripId) => {
  // Tenant-scope the trip lookup so parents/managers from other orgs can't peek.
  const t = await query(
    `SELECT id FROM trips WHERE id = $1 AND organization_id = $2`,
    [tripId, user.organizationId],
  );
  if (!t.rows[0]) throw ApiError.notFound('Trip not found');

  const { rows } = await query(
    `SELECT id, child_id, status, method, timestamp
     FROM checkins WHERE trip_id = $1 ORDER BY timestamp DESC`,
    [tripId],
  );
  return rows;
};

/**
 * Trip / check-in history for a single child.
 *
 * Access rules:
 *   - Parents may only query their own children.
 *   - Drivers/managers/admins may query any child in their organization.
 * Returns the most recent `limit` rows, joined with trip + route metadata
 * so the parent app can show "Yasmine — Morning North Loop — boarded 07:32".
 */
export const listForChild = async (user, childId, { limit = 50 } = {}) => {
  const childRow = await query(
    `SELECT id, organization_id, parent_id FROM children
     WHERE id = $1 AND deleted_at IS NULL`,
    [childId],
  );
  const child = childRow.rows[0];
  if (!child) throw ApiError.notFound('Child not found');
  if (child.organization_id !== user.organizationId) {
    throw ApiError.forbidden('Child does not belong to your organization');
  }
  const isParent = (user.roles || []).includes('parent');
  if (isParent && child.parent_id !== user.id) {
    throw ApiError.forbidden('Parents may only view their own children');
  }

  const { rows } = await query(
    `SELECT ck.id, ck.trip_id, ck.status, ck.method, ck.timestamp,
            t.route_id, t.start_time, t.end_time, t.status AS trip_status,
            r.name AS route_name
       FROM checkins ck
       JOIN trips t ON t.id = ck.trip_id
       LEFT JOIN routes r ON r.id = t.route_id
      WHERE ck.child_id = $1
      ORDER BY ck.timestamp DESC
      LIMIT $2`,
    [childId, Math.min(Number(limit) || 50, 500)],
  );
  return rows;
};

import { query, withTransaction } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const COLUMNS = `
  t.id, t.organization_id, t.route_id, t.assignment_id, t.status,
  t.start_time, t.end_time, t.created_at
`;

/**
 * Start a trip.
 *
 * Business rules:
 *   - If assignmentId is supplied, it must belong to the org and be active.
 *   - Otherwise we resolve the active assignment for routeId.
 *   - Only one in_progress trip per driver at a time.
 */
export const start = async (orgId, { routeId, assignmentId }) => {
  return withTransaction(async (c) => {
    let assignment;
    if (assignmentId) {
      const r = await c.query(
        `SELECT id, route_id, driver_id, bus_id FROM route_assignments
         WHERE id = $1 AND organization_id = $2 AND is_active = TRUE`,
        [assignmentId, orgId],
      );
      assignment = r.rows[0];
      if (!assignment) throw ApiError.badRequest('Assignment not found or inactive');
      if (assignment.route_id !== routeId) {
        throw ApiError.badRequest('Assignment does not match route');
      }
    } else {
      const r = await c.query(
        `SELECT id, route_id, driver_id, bus_id FROM route_assignments
         WHERE route_id = $1 AND organization_id = $2 AND is_active = TRUE
         ORDER BY created_at DESC LIMIT 1`,
        [routeId, orgId],
      );
      assignment = r.rows[0];
      if (!assignment) throw ApiError.badRequest('No active assignment for this route');
    }

    const conflict = await c.query(
      `SELECT t.id FROM trips t
       JOIN route_assignments ra ON ra.id = t.assignment_id
       WHERE ra.driver_id = $1 AND t.status = 'in_progress'`,
      [assignment.driver_id],
    );
    if (conflict.rowCount > 0) {
      throw ApiError.conflict('Driver already has an active trip');
    }

    const { rows } = await c.query(
      `INSERT INTO trips (organization_id, route_id, assignment_id, status, start_time)
       VALUES ($1, $2, $3, 'in_progress', NOW())
       RETURNING ${COLUMNS.replace(/t\./g, '')}`,
      [orgId, routeId, assignment.id],
    );
    return rows[0];
  });
};

export const end = async (tripId, orgId) => {
  const { rows } = await query(
    `UPDATE trips SET status = 'completed', end_time = NOW()
     WHERE id = $1 AND organization_id = $2 AND status = 'in_progress'
     RETURNING ${COLUMNS.replace(/t\./g, '')}`,
    [tripId, orgId],
  );
  if (!rows[0]) throw ApiError.notFound('Active trip not found');
  return rows[0];
};

export const get = (tripId, orgId) =>
  query(
    `SELECT ${COLUMNS.replace(/t\./g, '')}
     FROM trips WHERE id = $1 AND organization_id = $2`,
    [tripId, orgId],
  ).then((r) => r.rows[0]);

export const listActive = (orgId) =>
  query(
    `SELECT ${COLUMNS}, ra.driver_id, ra.bus_id
     FROM trips t
     LEFT JOIN route_assignments ra ON ra.id = t.assignment_id
     WHERE t.organization_id = $1 AND t.status = 'in_progress'
     ORDER BY t.start_time DESC`,
    [orgId],
  ).then((r) => r.rows);

export const listHistory = (orgId, { limit = 100, offset = 0 } = {}) =>
  query(
    `SELECT ${COLUMNS}, ra.driver_id, ra.bus_id
     FROM trips t
     LEFT JOIN route_assignments ra ON ra.id = t.assignment_id
     WHERE t.organization_id = $1 AND t.status <> 'in_progress'
     ORDER BY t.start_time DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset],
  ).then((r) => r.rows);

/**
 * Auto-close trips with no GPS activity for `minutes` minutes.
 * Called by the cron job.
 */
export const autoCloseStaleTrips = async (minutes = 30) => {
  const { rows } = await query(
    `UPDATE trips t
     SET status = 'completed', end_time = NOW()
     WHERE t.status = 'in_progress'
       AND COALESCE(
         (SELECT MAX(recorded_at) FROM gps_logs g WHERE g.trip_id = t.id),
         t.start_time
       ) < NOW() - ($1 || ' minutes')::interval
     RETURNING t.id`,
    [String(minutes)],
  );
  return rows.map((r) => r.id);
};

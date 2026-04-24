import { query } from '../config/db.js';

export const start = async (orgId, { routeId, assignmentId }) => {
  const { rows } = await query(
    `INSERT INTO trips (organization_id, route_id, assignment_id, status, start_time)
     VALUES ($1,$2,$3,'in_progress', NOW())
     RETURNING id, organization_id, route_id, status, start_time`,
    [orgId, routeId, assignmentId || null],
  );
  return rows[0];
};

export const end = async (tripId) => {
  const { rows } = await query(
    `UPDATE trips SET status = 'completed', end_time = NOW()
     WHERE id = $1 RETURNING id, status, end_time`,
    [tripId],
  );
  return rows[0];
};

export const get = (tripId) =>
  query(
    `SELECT id, organization_id, route_id, assignment_id, status, start_time, end_time
     FROM trips WHERE id = $1`,
    [tripId],
  ).then((r) => r.rows[0]);

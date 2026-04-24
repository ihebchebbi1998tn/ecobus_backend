import { query, withTransaction } from '../config/db.js';

export const list = (orgId) =>
  query(
    `SELECT id, name, description, is_active, created_at
     FROM routes WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  ).then((r) => r.rows);

export const create = async (orgId, { name, description }) => {
  const { rows } = await query(
    `INSERT INTO routes (organization_id, name, description)
     VALUES ($1,$2,$3) RETURNING id, name, description, is_active, created_at`,
    [orgId, name, description || null],
  );
  return rows[0];
};

export const stops = (routeId) =>
  query(
    `SELECT id, name, latitude, longitude, stop_order, planned_time
     FROM route_stops WHERE route_id = $1
     ORDER BY stop_order ASC`,
    [routeId],
  ).then((r) => r.rows);

export const addStop = async (routeId, { name, latitude, longitude, stopOrder, plannedTime }) => {
  const { rows } = await query(
    `INSERT INTO route_stops (route_id, name, latitude, longitude, stop_order, planned_time)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, name, latitude, longitude, stop_order, planned_time`,
    [routeId, name, latitude, longitude, stopOrder, plannedTime || null],
  );
  return rows[0];
};

export const replaceStops = (routeId, stopList) =>
  withTransaction(async (c) => {
    await c.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);
    for (const s of stopList) {
      await c.query(
        `INSERT INTO route_stops (route_id, name, latitude, longitude, stop_order, planned_time)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [routeId, s.name, s.latitude, s.longitude, s.stopOrder, s.plannedTime || null],
      );
    }
    return { ok: true };
  });

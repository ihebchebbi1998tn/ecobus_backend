import { query } from '../config/db.js';

export const list = (orgId) =>
  query(
    `SELECT id, name, plate_number, capacity, status, created_at
     FROM buses WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [orgId],
  ).then((r) => r.rows);

export const create = async (orgId, { name, plateNumber, capacity }) => {
  const { rows } = await query(
    `INSERT INTO buses (organization_id, name, plate_number, capacity)
     VALUES ($1,$2,$3,$4)
     RETURNING id, name, plate_number, capacity, status, created_at`,
    [orgId, name, plateNumber, capacity],
  );
  return rows[0];
};

export const liveStatus = (busId) =>
  query(
    `SELECT bus_id, trip_id, latitude, longitude, speed, heading, accuracy,
            battery_level, gps_status, last_update, updated_at
     FROM bus_live_status WHERE bus_id = $1`,
    [busId],
  ).then((r) => r.rows[0] || null);

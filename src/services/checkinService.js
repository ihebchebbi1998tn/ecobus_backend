import { query } from '../config/db.js';

export const create = async ({ tripId, childId, status, method }) => {
  const { rows } = await query(
    `INSERT INTO checkins (trip_id, child_id, status, method, timestamp)
     VALUES ($1,$2,$3,$4, NOW())
     RETURNING id, trip_id, child_id, status, method, timestamp`,
    [tripId, childId, status, method],
  );
  return rows[0];
};

export const listForTrip = (tripId) =>
  query(
    `SELECT id, child_id, status, method, timestamp
     FROM checkins WHERE trip_id = $1 ORDER BY timestamp DESC`,
    [tripId],
  ).then((r) => r.rows);

import { query } from '../config/db.js';

export const trigger = async (userId, { tripId, latitude, longitude }) => {
  const { rows } = await query(
    `INSERT INTO sos_alerts (user_id, trip_id, latitude, longitude, status)
     VALUES ($1,$2,$3,$4,'active')
     RETURNING id, user_id, trip_id, latitude, longitude, status, created_at`,
    [userId, tripId || null, latitude ?? null, longitude ?? null],
  );
  return rows[0];
};

export const resolve = (id) =>
  query(`UPDATE sos_alerts SET status = 'resolved' WHERE id = $1 RETURNING id, status`, [id])
    .then((r) => r.rows[0]);

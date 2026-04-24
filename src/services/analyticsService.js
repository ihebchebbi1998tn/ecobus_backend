import { query } from '../config/db.js';

export const recordEvent = ({ sessionId, userId, eventType, metadata }) =>
  query(
    `INSERT INTO events (session_id, user_id, event_type, metadata)
     VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
    [sessionId || null, userId || null, eventType, metadata || {}],
  ).then((r) => r.rows[0]);

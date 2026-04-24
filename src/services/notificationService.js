import { query } from '../config/db.js';

export const listForUser = (userId) =>
  query(
    `SELECT id, title, message, type, is_read, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 100`,
    [userId],
  ).then((r) => r.rows);

export const markRead = (id, userId) =>
  query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2 RETURNING id, is_read`,
    [id, userId],
  ).then((r) => r.rows[0]);

export const create = ({ userId, title, message, type }) =>
  query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1,$2,$3,$4) RETURNING id, title, message, type, is_read, created_at`,
    [userId, title, message, type || 'info'],
  ).then((r) => r.rows[0]);

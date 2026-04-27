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

/**
 * Mark every unread notification belonging to `userId` as read in one
 * round-trip. Returns the affected row count for the UX badge.
 */
export const markAllRead = (userId) =>
  query(
    `UPDATE notifications SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  ).then((r) => ({ updated: r.rowCount }));

export const create = ({ userId, title, message, type }) =>
  query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1,$2,$3,$4) RETURNING id, title, message, type, is_read, created_at`,
    [userId, title, message, type || 'info'],
  ).then((r) => r.rows[0]);

/**
 * Bulk-insert notifications in a single round-trip.
 * Use this for fan-outs (stop arrivals, SOS, delays) so we don't issue
 * N inserts per event. Silently ignores empty input.
 *
 * @param {Array<{userId:string,title:string,message:string,type?:string}>} items
 */
export const createMany = async (items) => {
  if (!items || items.length === 0) return [];
  const values = [];
  const params = [];
  items.forEach((it, i) => {
    const o = i * 4;
    values.push(`($${o + 1},$${o + 2},$${o + 3},$${o + 4})`);
    params.push(it.userId, it.title, it.message, it.type || 'info');
  });
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ${values.join(',')}
     RETURNING id, user_id, title, message, type, is_read, created_at`,
    params,
  );
  return rows;
};

/**
 * FCM (Firebase Cloud Messaging) push sender — STUB.
 *
 * This module intentionally does not call Firebase. It loads device tokens
 * from the database and logs the would-be payload. Wire firebase-admin here
 * once the FIREBASE_SERVICE_ACCOUNT secret is provisioned.
 *
 * Contract:
 *   sendToUser(userId, { title, body, data? })
 *   sendToUsers([userIds], { title, body, data? })
 *
 * Returns { sent, skipped, devices } so callers can record delivery stats.
 */
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

const loadActiveTokens = async (userIds) => {
  if (!userIds.length) return [];
  const { rows } = await query(
    `SELECT id, user_id, token, platform
     FROM device_tokens
     WHERE user_id = ANY($1::uuid[]) AND revoked_at IS NULL`,
    [userIds],
  );
  return rows;
};

export const sendToUsers = async (userIds, payload) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return { sent: 0, skipped: 0, devices: 0 };

  const tokens = await loadActiveTokens(ids);
  if (!tokens.length) {
    logger.info('fcm.stub: no device tokens for recipients', { recipients: ids.length });
    return { sent: 0, skipped: ids.length, devices: 0 };
  }

  // TODO: replace with firebase-admin sendEachForMulticast when configured.
  logger.info('fcm.stub: would send push notification', {
    recipients: ids.length,
    devices: tokens.length,
    title: payload?.title,
    body: payload?.body,
    data: payload?.data || null,
    platforms: [...new Set(tokens.map((t) => t.platform))],
  });

  // Best-effort: bump last_seen_at so dashboards can see the device was targeted.
  await query(
    `UPDATE device_tokens SET last_seen_at = NOW() WHERE id = ANY($1::uuid[])`,
    [tokens.map((t) => t.id)],
  );

  return { sent: tokens.length, skipped: 0, devices: tokens.length };
};

export const sendToUser = (userId, payload) => sendToUsers([userId], payload);

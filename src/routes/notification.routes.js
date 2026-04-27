import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as svc from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications (latest 100)
 */
router.get('/', asyncHandler(async (req, res) => res.json(await svc.listForUser(req.user.id))));

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark every unread notification for the current user as read
 *     responses:
 *       200:
 *         description: Number of notifications updated
 */
router.patch('/read-all', asyncHandler(async (req, res) =>
  res.json(await svc.markAllRead(req.user.id))));

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 */
router.patch(
  '/:id/read',
  validate(idParam, 'params'),
  asyncHandler(async (req, res) => {
    const updated = await svc.markRead(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  }),
);

export default router;

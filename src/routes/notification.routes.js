import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as svc from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications (latest 100)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 */
router.get('/', asyncHandler(async (req, res) => res.json(await svc.listForUser(req.user.id))));

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const updated = await svc.markRead(req.params.id, req.user.id);
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json(updated);
}));

export default router;

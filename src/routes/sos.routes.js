import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sosSchema } from '../validators/schemas.js';
import * as svc from '../services/sosService.js';
import { getIO } from '../sockets/io.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /sos:
 *   post:
 *     tags: [SOS]
 *     summary: Trigger an SOS alert
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SosInput' }
 *     responses:
 *       201:
 *         description: Created — broadcasts `sos:new` on `org:{orgId}` socket room
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SosAlert' }
 */
router.post(
  '/',
  validate(sosSchema),
  asyncHandler(async (req, res) => {
    const alert = await svc.trigger(req.user.id, req.body);
    getIO()?.to(`org:${req.user.organizationId}`).emit('sos:new', alert);
    res.status(201).json(alert);
  }),
);

/**
 * @openapi
 * /sos/{id}/resolve:
 *   patch:
 *     tags: [SOS]
 *     summary: Mark an SOS alert as resolved
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 */
router.patch('/:id/resolve', asyncHandler(async (req, res) => res.json(await svc.resolve(req.params.id))));

export default router;

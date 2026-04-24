import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkinSchema } from '../validators/schemas.js';
import * as svc from '../services/checkinService.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /checkins:
 *   post:
 *     tags: [Check-ins]
 *     summary: Record a child boarding/leaving event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckinInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Checkin' }
 */
router.post(
  '/',
  validate(checkinSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.body))),
);

/**
 * @openapi
 * /checkins/trip/{tripId}:
 *   get:
 *     tags: [Check-ins]
 *     summary: List check-ins for a trip
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Checkin' }
 */
router.get('/trip/:tripId', asyncHandler(async (req, res) => res.json(await svc.listForTrip(req.params.tripId))));

export default router;

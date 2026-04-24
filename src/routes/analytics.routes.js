import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { eventSchema } from '../validators/schemas.js';
import * as svc from '../services/analyticsService.js';

const router = Router();

/**
 * @openapi
 * /analytics/events:
 *   post:
 *     tags: [Analytics]
 *     summary: Track a product analytics event (anonymous allowed)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AnalyticsEventInput' }
 *     responses:
 *       201: { description: Recorded }
 */
router.post(
  '/events',
  validate(eventSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.recordEvent(req.body))),
);

export default router;

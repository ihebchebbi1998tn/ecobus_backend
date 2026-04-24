import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { tripSchema } from '../validators/schemas.js';
import * as svc from '../services/tripService.js';
import { getIO } from '../sockets/io.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /trips:
 *   post:
 *     tags: [Trips]
 *     summary: Start a new trip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TripInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Trip' }
 */
router.post(
  '/',
  validate(tripSchema),
  asyncHandler(async (req, res) => {
    const trip = await svc.start(req.user.organizationId, req.body);
    getIO()?.to(`org:${req.user.organizationId}`).emit('trip:started', trip);
    res.status(201).json(trip);
  }),
);

/**
 * @openapi
 * /trips/{id}/end:
 *   patch:
 *     tags: [Trips]
 *     summary: End a trip
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Trip' }
 */
router.patch('/:id/end', asyncHandler(async (req, res) => {
  const trip = await svc.end(req.params.id);
  getIO()?.to(`org:${req.user.organizationId}`).emit('trip:ended', trip);
  res.json(trip);
}));

/**
 * @openapi
 * /trips/{id}:
 *   get:
 *     tags: [Trips]
 *     summary: Fetch a trip by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Trip' }
 *       404: { description: Not found }
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const trip = await svc.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
}));

export default router;

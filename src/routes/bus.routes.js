import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { busSchema } from '../validators/schemas.js';
import * as svc from '../services/busService.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /buses:
 *   get:
 *     tags: [Buses]
 *     summary: List buses for the current organization
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Bus' }
 *   post:
 *     tags: [Buses]
 *     summary: Create a bus
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BusInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Bus' }
 */
router.get('/', asyncHandler(async (req, res) => res.json(await svc.list(req.user.organizationId))));

router.post(
  '/',
  validate(busSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.user.organizationId, req.body))),
);

/**
 * @openapi
 * /buses/{id}/live:
 *   get:
 *     tags: [Buses]
 *     summary: Latest live status for a bus
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
 *             schema: { $ref: '#/components/schemas/LiveStatus' }
 *       404: { description: No live status }
 */
router.get('/:id/live', asyncHandler(async (req, res) => {
  const data = await svc.liveStatus(req.params.id);
  if (!data) return res.status(404).json({ error: 'No live status' });
  res.json(data);
}));

export default router;

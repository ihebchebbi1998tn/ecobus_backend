import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { routeSchema, stopSchema } from '../validators/schemas.js';
import * as svc from '../services/routeService.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /routes:
 *   get:
 *     tags: [Routes]
 *     summary: List routes
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Route' }
 *   post:
 *     tags: [Routes]
 *     summary: Create a route
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RouteInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Route' }
 */
router.get('/', asyncHandler(async (req, res) => res.json(await svc.list(req.user.organizationId))));

router.post(
  '/',
  validate(routeSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.user.organizationId, req.body))),
);

/**
 * @openapi
 * /routes/{id}/stops:
 *   get:
 *     tags: [Routes]
 *     summary: List stops for a route (ordered)
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
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Stop' }
 *   post:
 *     tags: [Routes]
 *     summary: Add a stop to a route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/StopInput' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Stop' }
 */
router.get('/:id/stops', asyncHandler(async (req, res) => res.json(await svc.stops(req.params.id))));

router.post(
  '/:id/stops',
  validate(stopSchema),
  asyncHandler(async (req, res) => res.status(201).json(await svc.addStop(req.params.id, req.body))),
);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as svc from '../services/geofenceService.js';

const router = Router();
router.use(requireAuth);

const geofenceSchema = z.object({
  name: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(10).max(100000),
});

const updateGeofenceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().int().min(10).max(100000).optional(),
}).refine((v) => Object.keys(v).length > 0, 'At least one field required');

router.get('/', asyncHandler(async (req, res) =>
  res.json(await svc.list(req.user.organizationId))));

router.post('/', validate(geofenceSchema), asyncHandler(async (req, res) =>
  res.status(201).json(await svc.create(req.user.organizationId, req.body))));

router.get('/:id', asyncHandler(async (req, res) =>
  res.json(await svc.getById(req.user.organizationId, req.params.id))));

router.patch('/:id', validate(updateGeofenceSchema), asyncHandler(async (req, res) =>
  res.json(await svc.update(req.user.organizationId, req.params.id, req.body))));

router.delete('/:id', asyncHandler(async (req, res) =>
  res.json(await svc.remove(req.user.organizationId, req.params.id))));

export default router;

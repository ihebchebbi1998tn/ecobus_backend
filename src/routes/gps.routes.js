import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { gpsSchema } from '../validators/schemas.js';
import * as svc from '../services/gpsService.js';
import { getIO } from '../sockets/io.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /gps:
 *   post:
 *     tags: [GPS]
 *     summary: Ingest a GPS ping from a driver device
 *     description: Persists to gps_logs and upserts bus_live_status. Broadcasts on Socket.IO rooms `bus:{busId}` and `org:{organizationId}`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GpsInput' }
 *     responses:
 *       202:
 *         description: Accepted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LiveStatus' }
 */
router.post(
  '/',
  validate(gpsSchema),
  asyncHandler(async (req, res) => {
    const live = await svc.ingest(req.body);
    const io = getIO();
    if (io) {
      io.to(`bus:${req.body.busId}`).emit('bus:location', live);
      io.to(`org:${req.user.organizationId}`).emit('bus:location', live);
    }
    res.status(202).json(live);
  }),
);

export default router;

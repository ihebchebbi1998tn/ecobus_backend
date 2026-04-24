import { Router } from 'express';
import auth from './auth.routes.js';
import buses from './bus.routes.js';
import routes from './route.routes.js';
import trips from './trip.routes.js';
import gps from './gps.routes.js';
import checkins from './checkin.routes.js';
import sos from './sos.routes.js';
import notifications from './notification.routes.js';
import analytics from './analytics.routes.js';
import health from './health.routes.js';
import logs from './logs.routes.js';

const router = Router();

router.use('/health', health);
router.use('/logs', logs);
router.use('/auth', auth);
router.use('/buses', buses);
router.use('/routes', routes);
router.use('/trips', trips);
router.use('/gps', gps);
router.use('/checkins', checkins);
router.use('/sos', sos);
router.use('/notifications', notifications);
router.use('/analytics', analytics);

export default router;

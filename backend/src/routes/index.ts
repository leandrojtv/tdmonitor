import { Router } from 'express';
import connectionsRoutes from './connections.routes';
import panelsRoutes from './panels.routes';
import schedulesRoutes from './schedules.routes';
import dashboardRoutes from './dashboard.routes';
import logsRoutes from './logs.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

router.use('/connections', connectionsRoutes);
router.use('/panels', panelsRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/logs', logsRoutes);

export default router;

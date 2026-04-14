import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { ExecutionLog, Schedule, TeradataConnection } from '../entities';
import { cacheService } from '../services/CacheService';
import { eventStreamService } from '../services/EventStreamService';
import { fail, ok } from '../utils/apiResponse';

const router = Router();

router.get('/data', async (_req, res) => {
  try {
    const data = await cacheService.getAllActiveCache();
    res.json(ok(data));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao carregar dashboard'));
  }
});

router.get('/status', async (_req, res) => {
  try {
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const connRepo = AppDataSource.getRepository(TeradataConnection);
    const logRepo = AppDataSource.getRepository(ExecutionLog);

    const lastLog = await logRepo.findOne({ order: { executedAt: 'DESC' } });
    const activeConnections = await connRepo.count({ where: { isActive: true } });
    const schedules = await scheduleRepo.find({ where: { isEnabled: true }, order: { updatedAt: 'DESC' } });

    res.json(
      ok({
        lastExecution: lastLog?.executedAt ?? null,
        nextExecutionHint: schedules[0]?.cronExpression ?? null,
        activeConnections,
        activeSchedules: schedules.length,
        cacheCleanupAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao carregar status do dashboard'));
  }
});

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = eventStreamService.subscribe('panel_updated', (payload) => {
    res.write(`event: panel_updated\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

export default router;

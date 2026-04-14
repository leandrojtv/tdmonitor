import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { initializeDatabase } from './config/database';
import { cacheService } from './services/CacheService';
import { schedulerService } from './services/SchedulerService';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api', routes);
app.use(errorHandler);

async function bootstrap() {
  await initializeDatabase();

  setInterval(async () => {
    try {
      const deleted = await cacheService.cleanExpiredCache();
      if (deleted > 0) {
        console.log(`[CACHE] ${deleted} registros expirados removidos.`);
      }
    } catch (error) {
      console.error(new Date().toISOString(), '[CACHE] Erro ao limpar cache expirado', error);
    }
  }, 60_000);

  const loadedSchedules = await schedulerService.reloadActiveSchedules();

  app.listen(env.port, () => {
    console.log(`TD::MONITOR Backend ready — ${loadedSchedules} schedules loaded`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Erro fatal ao inicializar aplicação:', error);
  process.exit(1);
});

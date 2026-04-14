import cron, { ScheduledTask } from 'node-cron';
import { AppDataSource } from '../config/database';
import { ExecutionLog, ReportPanel, Schedule } from '../entities';
import { cacheService } from './CacheService';
import { applyMapping, FieldMappings } from './MappingService';
import { teradataService } from './TeradataService';

export class SchedulerService {
  private readonly jobs = new Map<string, ScheduledTask>();

  async reloadActiveSchedules(): Promise<number> {
    this.stopAll();

    const repo = AppDataSource.getRepository(Schedule);
    const activeSchedules = await repo.find({ where: { isEnabled: true } });

    for (const schedule of activeSchedules) {
      this.registerSchedule(schedule);
    }

    return activeSchedules.length;
  }

  registerSchedule(schedule: Schedule): void {
    if (!cron.validate(schedule.cronExpression)) {
      console.error(`[SCHEDULER] Expressão cron inválida para schedule ${schedule.id}: ${schedule.cronExpression}`);
      return;
    }

    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`[SCHEDULER] Executando schedule ${schedule.id} (${schedule.name})`);
      await this.executeScheduleNow(schedule.id);
    });

    this.jobs.set(schedule.id, task);
    console.log(`[SCHEDULER] Schedule registrado: ${schedule.name} (${schedule.cronExpression})`);
  }

  async executeScheduleNow(scheduleId: string): Promise<void> {
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const logRepo = AppDataSource.getRepository(ExecutionLog);

    const schedule = await scheduleRepo.findOne({ where: { id: scheduleId } });

    if (!schedule) {
      console.error(`[SCHEDULER] Schedule ${scheduleId} não encontrado`);
      return;
    }

    const startedAt = Date.now();
    schedule.lastRunStatus = 'running';
    schedule.lastRunAt = new Date();
    await scheduleRepo.save(schedule);

    let hasError = false;

    for (const panelId of schedule.panelIds) {
      const panel = await panelRepo.findOne({ where: { id: panelId } });

      if (!panel) {
        console.warn(`[SCHEDULER] Painel ${panelId} não encontrado no schedule ${schedule.id}`);
        continue;
      }

      const panelStart = Date.now();

      try {
        console.log(`[SCHEDULER] Executando painel ${panel.panelKey} (${panel.id})`);
        const rawResult = await teradataService.executeQuery(panel.connectionId, panel.sqlQuery);
        const mappedData = applyMapping(rawResult.rows, (panel.fieldMappings ?? {}) as FieldMappings);

        await cacheService.saveCache(panel.id, mappedData, rawResult.row_count, rawResult.duration_ms);

        await logRepo.save(
          logRepo.create({
            scheduleId: schedule.id,
            panelId: panel.id,
            connectionId: panel.connectionId,
            status: 'success',
            durationMs: Date.now() - panelStart,
            rowCount: rawResult.row_count
          })
        );

        console.log(`[SCHEDULER] Painel ${panel.panelKey} finalizado com sucesso`);
      } catch (error) {
        hasError = true;
        const message = String(error);

        console.error(`[SCHEDULER] Erro ao executar painel ${panel.panelKey}: ${message}`);

        await logRepo.save(
          logRepo.create({
            scheduleId: schedule.id,
            panelId: panel.id,
            connectionId: panel.connectionId,
            status: 'error',
            durationMs: Date.now() - panelStart,
            errorMessage: message
          })
        );
      }
    }

    schedule.lastRunDurationMs = Date.now() - startedAt;
    schedule.lastRunStatus = hasError ? 'error' : 'success';
    schedule.lastErrorMessage = hasError ? 'Um ou mais painéis falharam' : null;
    await scheduleRepo.save(schedule);

    console.log(
      `[SCHEDULER] Schedule ${schedule.name} finalizado com status ${schedule.lastRunStatus} em ${schedule.lastRunDurationMs} ms`
    );
  }

  stopAll(): void {
    for (const [id, task] of this.jobs.entries()) {
      task.stop();
      this.jobs.delete(id);
    }
  }
}

export const schedulerService = new SchedulerService();

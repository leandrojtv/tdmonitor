import { AppDataSource } from '../config/database';
import { PanelDataCache, ReportPanel } from '../entities';
import { env } from '../config/env';
import { eventStreamService } from './EventStreamService';

export class CacheService {
  async saveCache(panelId: string, data: unknown, rowCount: number, durationMs: number): Promise<PanelDataCache> {
    const repo = AppDataSource.getRepository(PanelDataCache);
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const expiresAt = new Date(Date.now() + env.cacheTtlMinutes * 60 * 1000);

    const cache = repo.create({
      panelId,
      data: data as Record<string, unknown>,
      rowCount,
      queryDurationMs: durationMs,
      expiresAt
    });

    const saved = await repo.save(cache);
    const panel = await panelRepo.findOne({ where: { id: panelId } });

    if (panel) {
      eventStreamService.emitPanelUpdated({
        panelKey: panel.panelKey,
        data,
        updatedAt: saved.executedAt.toISOString()
      });
    }

    return saved;
  }

  async getCache(panelId: string): Promise<PanelDataCache | null> {
    const repo = AppDataSource.getRepository(PanelDataCache);
    return repo.findOne({ where: { panelId }, order: { executedAt: 'DESC' } });
  }

  async getAllActiveCache(): Promise<Record<string, unknown[]>> {
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const cacheRepo = AppDataSource.getRepository(PanelDataCache);

    const panels = await panelRepo.find({ where: { isEnabled: true }, order: { executionOrder: 'ASC' } });
    const grouped: Record<string, unknown[]> = {};

    for (const panel of panels) {
      const cache = await cacheRepo.findOne({ where: { panelId: panel.id }, order: { executedAt: 'DESC' } });

      if (!grouped[panel.category]) {
        grouped[panel.category] = [];
      }

      grouped[panel.category].push({
        panelId: panel.id,
        panelKey: panel.panelKey,
        displayName: panel.displayName,
        data: cache?.data ?? null,
        executedAt: cache?.executedAt ?? null,
        rowCount: cache?.rowCount ?? 0,
        durationMs: cache?.queryDurationMs ?? 0
      });
    }

    return grouped;
  }

  async cleanExpiredCache(): Promise<number> {
    const repo = AppDataSource.getRepository(PanelDataCache);
    const result = await repo
      .createQueryBuilder()
      .delete()
      .where('expires_at IS NOT NULL AND expires_at < NOW()')
      .execute();

    return result.affected ?? 0;
  }
}

export const cacheService = new CacheService();

import { Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { AppDataSource } from '../config/database';
import { ExecutionLog, ReportPanel } from '../entities';
import { validateRequest } from '../middlewares/validateRequest';
import { cacheService } from '../services/CacheService';
import { applyMapping, FieldMappings } from '../services/MappingService';
import { teradataService } from '../services/TeradataService';
import { fail, ok } from '../utils/apiResponse';

const router = Router();

async function runPanel(panel: ReportPanel, saveCache: boolean) {
  const result = await teradataService.executeQuery(panel.connectionId, panel.sqlQuery);
  const mapped = applyMapping(result.rows, (panel.fieldMappings ?? {}) as FieldMappings);

  if (saveCache) {
    await cacheService.saveCache(panel.id, mapped, result.row_count, result.duration_ms);
  }

  const logRepo = AppDataSource.getRepository(ExecutionLog);
  await logRepo.save(
    logRepo.create({
      panelId: panel.id,
      connectionId: panel.connectionId,
      status: 'success',
      durationMs: result.duration_ms,
      rowCount: result.row_count
    })
  );

  return { ...result, mapped };
}

router.get('/', [query('category').optional().isString()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(ReportPanel);
    const where = req.query.category ? { category: String(req.query.category) } : {};
    const panels = await repo.find({ where, order: { executionOrder: 'ASC' } });
    res.json(ok(panels));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao listar painéis'));
  }
});

router.get('/:id', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(ReportPanel);
    const panel = await repo.findOne({ where: { id: req.params.id } });

    if (!panel) {
      res.status(404).json(fail('NotFound', 'Painel não encontrado'));
      return;
    }

    res.json(ok(panel));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao detalhar painel'));
  }
});

router.put(
  '/:id',
  [param('id').isUUID(), body('sqlQuery').isString().notEmpty(), body('fieldMappings').isObject()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(ReportPanel);
      const panel = await repo.findOne({ where: { id: req.params.id } });

      if (!panel) {
        res.status(404).json(fail('NotFound', 'Painel não encontrado'));
        return;
      }

      panel.sqlQuery = req.body.sqlQuery;
      panel.fieldMappings = req.body.fieldMappings;
      await repo.save(panel);
      res.json(ok(panel, 'Painel atualizado com sucesso'));
    } catch (error) {
      console.error(new Date().toISOString(), error);
      res.status(500).json(fail('InternalServerError', 'Erro ao atualizar painel'));
    }
  }
);

router.put('/:id/toggle', [param('id').isUUID(), body('isEnabled').isBoolean()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(ReportPanel);
    const panel = await repo.findOne({ where: { id: req.params.id } });

    if (!panel) {
      res.status(404).json(fail('NotFound', 'Painel não encontrado'));
      return;
    }

    panel.isEnabled = req.body.isEnabled;
    await repo.save(panel);
    res.json(ok(panel, 'Status do painel atualizado'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao atualizar status do painel'));
  }
});

router.post('/:id/execute', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const panel = await panelRepo.findOne({ where: { id: req.params.id } });

    if (!panel) {
      res.status(404).json(fail('NotFound', 'Painel não encontrado'));
      return;
    }

    const result = await runPanel(panel, true);
    res.json(ok(result, 'Painel executado e cache atualizado'));
  } catch (error) {
    console.error(new Date().toISOString(), error);

    const logRepo = AppDataSource.getRepository(ExecutionLog);
    await logRepo.save(logRepo.create({ panelId: req.params.id, status: 'error', errorMessage: String(error) }));

    res.status(500).json(fail('InternalServerError', 'Erro ao executar painel'));
  }
});

router.post('/:id/preview', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const panel = await panelRepo.findOne({ where: { id: req.params.id } });

    if (!panel) {
      res.status(404).json(fail('NotFound', 'Painel não encontrado'));
      return;
    }

    const result = await runPanel(panel, false);
    res.json(ok(result, 'Preview executado com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao executar preview'));
  }
});

router.get('/:id/data', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const cache = await cacheService.getCache(req.params.id);

    if (!cache) {
      res.status(404).json(fail('NotFound', 'Nenhum cache encontrado para este painel'));
      return;
    }

    res.json(ok(cache));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao buscar cache do painel'));
  }
});

router.post('/:id/validate-sql', [param('id').isUUID(), body('sql').isString().notEmpty()], validateRequest, async (req: Request, res: Response) => {
  try {
    const panelRepo = AppDataSource.getRepository(ReportPanel);
    const panel = await panelRepo.findOne({ where: { id: req.params.id } });

    if (!panel) {
      res.status(404).json(fail('NotFound', 'Painel não encontrado'));
      return;
    }

    const sql = String(req.body.sql).trim().replace(/;$/, '');
    const validationSql = `SELECT TOP 1 * FROM (${sql}) AS subquery_validation`;

    const result = await teradataService.executeQuery(panel.connectionId, validationSql);
    res.json(ok({ valid: true, preview: result.rows.slice(0, 1) }, 'SQL válido'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(400).json(fail('ValidationError', `SQL inválido: ${String(error)}`));
  }
});

export default router;

import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { AppDataSource } from '../config/database';
import { Schedule } from '../entities';
import { validateRequest } from '../middlewares/validateRequest';
import { schedulerService } from '../services/SchedulerService';
import { fail, ok } from '../utils/apiResponse';

const router = Router();

const baseValidation = [
  body('connectionId').isUUID(),
  body('name').isString().notEmpty(),
  body('cronExpression').isString().notEmpty(),
  body('panelIds').isArray({ min: 1 })
];

router.post('/', baseValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const payload = repo.create(req.body);
    const saved = await repo.save(payload);
    await schedulerService.reloadActiveSchedules();
    res.status(201).json(ok(saved, 'Schedule criado com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao criar schedule'));
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const list = await repo.find({ order: { createdAt: 'DESC' } });
    res.json(ok(list));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao listar schedules'));
  }
});

router.get('/:id', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) {
      res.status(404).json(fail('NotFound', 'Schedule não encontrado'));
      return;
    }
    res.json(ok(item));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao detalhar schedule'));
  }
});

router.put('/:id', [param('id').isUUID(), ...baseValidation], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) {
      res.status(404).json(fail('NotFound', 'Schedule não encontrado'));
      return;
    }

    repo.merge(item, req.body);
    const saved = await repo.save(item);
    await schedulerService.reloadActiveSchedules();
    res.json(ok(saved, 'Schedule atualizado com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao atualizar schedule'));
  }
});

router.delete('/:id', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) {
      res.status(404).json(fail('NotFound', 'Schedule não encontrado'));
      return;
    }

    await repo.remove(item);
    await schedulerService.reloadActiveSchedules();
    res.json(ok(undefined, 'Schedule removido com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao remover schedule'));
  }
});

router.put('/:id/toggle', [param('id').isUUID(), body('isEnabled').isBoolean()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) {
      res.status(404).json(fail('NotFound', 'Schedule não encontrado'));
      return;
    }

    item.isEnabled = req.body.isEnabled;
    const saved = await repo.save(item);
    await schedulerService.reloadActiveSchedules();
    res.json(ok(saved, 'Status do schedule atualizado'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao atualizar status do schedule'));
  }
});

router.post('/:id/run', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Schedule);
    const exists = await repo.findOne({ where: { id: req.params.id } });

    if (!exists) {
      res.status(404).json(fail('NotFound', 'Schedule não encontrado'));
      return;
    }

    await schedulerService.executeScheduleNow(req.params.id);
    const schedule = await repo.findOne({ where: { id: req.params.id } });
    res.json(ok(schedule, 'Schedule executado com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao executar schedule'));
  }
});

export default router;

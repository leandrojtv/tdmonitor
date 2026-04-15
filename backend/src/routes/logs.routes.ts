import { Request, Response, Router } from 'express';
import { query } from 'express-validator';
import { AppDataSource } from '../config/database';
import { ExecutionLog } from '../entities';
import { validateRequest } from '../middlewares/validateRequest';
import { fail, ok } from '../utils/apiResponse';

const router = Router();

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('panel_id').optional().isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(ExecutionLog);
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);

      const qb = repo.createQueryBuilder('log').orderBy('log.executed_at', 'DESC');

      if (req.query.panel_id) {
        qb.andWhere('log.panel_id = :panelId', { panelId: String(req.query.panel_id) });
      }

      const [items, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      res.json(
        ok({
          items,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        })
      );
    } catch (error) {
      console.error(new Date().toISOString(), error);
      res.status(500).json(fail('InternalServerError', 'Erro ao listar logs'));
    }
  }
);

export default router;

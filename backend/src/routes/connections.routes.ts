import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { AppDataSource } from '../config/database';
import { TeradataConnection } from '../entities';
import { validateRequest } from '../middlewares/validateRequest';
import { fail, ok } from '../utils/apiResponse';
import { cryptoService } from '../services/CryptoService';
import { teradataService } from '../services/TeradataService';

const router = Router();

const baseValidation = [
  body('name').isString().isLength({ min: 2, max: 100 }),
  body('host').isString().notEmpty(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  body('databaseName').optional().isString(),
  body('jdbcParams').optional().isObject()
];

router.post('/', baseValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const payload = repo.create({
      name: req.body.name,
      host: req.body.host,
      port: req.body.port ?? 1025,
      username: req.body.username,
      password: cryptoService.encrypt(req.body.password),
      databaseName: req.body.databaseName ?? null,
      jdbcParams: req.body.jdbcParams ?? {}
    });

    const saved = await repo.save(payload);
    res.status(201).json(ok({ ...saved, password: undefined }, 'Conexão criada com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao criar conexão'));
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const items = await repo.find({ order: { createdAt: 'DESC' } });
    const sanitized = items.map(({ password, ...rest }) => rest);
    res.json(ok(sanitized));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao listar conexões'));
  }
});

router.get('/:id', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const conn = await repo.findOne({ where: { id: req.params.id } });

    if (!conn) {
      res.status(404).json(fail('NotFound', 'Conexão não encontrada'));
      return;
    }

    const { password, ...safe } = conn;
    res.json(ok(safe));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao detalhar conexão'));
  }
});

router.put('/:id', [param('id').isUUID(), ...baseValidation], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const conn = await repo.findOne({ where: { id: req.params.id } });

    if (!conn) {
      res.status(404).json(fail('NotFound', 'Conexão não encontrada'));
      return;
    }

    repo.merge(conn, {
      name: req.body.name,
      host: req.body.host,
      port: req.body.port ?? 1025,
      username: req.body.username,
      password: cryptoService.encrypt(req.body.password),
      databaseName: req.body.databaseName ?? null,
      jdbcParams: req.body.jdbcParams ?? conn.jdbcParams
    });

    const updated = await repo.save(conn);
    const { password, ...safe } = updated;
    res.json(ok(safe, 'Conexão atualizada com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao atualizar conexão'));
  }
});

router.delete('/:id', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const conn = await repo.findOne({ where: { id: req.params.id } });

    if (!conn) {
      res.status(404).json(fail('NotFound', 'Conexão não encontrada'));
      return;
    }

    await repo.remove(conn);
    res.json(ok(undefined, 'Conexão removida com sucesso'));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao remover conexão'));
  }
});

router.post('/:id/test', [param('id').isUUID()], validateRequest, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(TeradataConnection);
    const conn = await repo.findOne({ where: { id: req.params.id } });

    if (!conn) {
      res.status(404).json(fail('NotFound', 'Conexão não encontrada'));
      return;
    }

    const result = await teradataService.testConnection(conn.id);

    conn.lastTestAt = new Date();
    conn.lastTestSuccess = result.success;
    conn.lastTestMessage = result.message;
    await repo.save(conn);

    res.json(ok(result));
  } catch (error) {
    console.error(new Date().toISOString(), error);
    res.status(500).json(fail('InternalServerError', 'Erro ao testar conexão'));
  }
});

export default router;

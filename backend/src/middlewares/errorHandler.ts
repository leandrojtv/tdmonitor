import { NextFunction, Request, Response } from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(error);

  res.status(500).json({
    message: 'Erro interno do servidor'
  });
}

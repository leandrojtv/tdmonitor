import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: errors.array().map((item) => item.msg).join('; ')
    });
    return;
  }

  next();
}

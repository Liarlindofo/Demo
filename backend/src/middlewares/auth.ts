import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  clientId?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Token de autenticação não fornecido'
    });
    return;
  }

  const token = authHeader.substring(7);

  if (token !== config.drinApiKey) {
    res.status(403).json({
      success: false,
      error: 'Token inválido'
    });
    return;
  }

  next();
};


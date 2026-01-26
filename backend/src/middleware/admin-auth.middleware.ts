

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import prisma from '../lib/prisma.js';


export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!user.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Admin auth middleware error:', error.message);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

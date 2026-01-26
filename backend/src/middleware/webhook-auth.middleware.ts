

import { Request, Response, NextFunction } from 'express';

const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY;

export function webhookAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth if no API key is configured (development mode)
  if (!WEBHOOK_API_KEY) {
    console.warn('[WEBHOOK] No WEBHOOK_API_KEY configured - webhooks are unprotected!');
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  if (apiKey !== WEBHOOK_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

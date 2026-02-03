import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import { authenticate } from './middleware/auth.middleware.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import authRouter from './modules/auth/auth.routes.js';
import checklistRouter from './modules/checklist/checklist.routes.js';
import itineraryRouter from './modules/itinerary/itinerary.routes.js';
import placesRouter from './modules/places/places.routes.js';
import ragRouter from './modules/ai/rag.routes.js';
import webhooksRouter from './modules/webhook/webhook.routes.js';
import usersRouter from './modules/user/user.routes.js';
import friendshipRouter from './modules/friendship/friendship.routes.js';
import notificationRouter from './modules/notification/notification.routes.js';
import messagingRouter from './modules/message/message.routes.js';
import postsRouter from './modules/post/post.routes.js';
import adminRouter from './modules/admin/admin.routes.js';
import { createServer } from 'http';
import { socketService } from './modules/shared/socket.service.js';

import { webhookAuth } from './middleware/webhook-auth.middleware.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());


app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({ 
    message: 'TravelWise API is running', 
    endpoints: ['/auth', '/itinerary', '/places', '/checklist', '/webhooks'],
  });
});

app.use('/api/auth', authRouter);
app.use('/api/itinerary', authenticate, itineraryRouter);
app.use('/api/itinerary', authenticate, ragRouter); 
app.use('/api/places', authenticate, placesRouter);
app.use('/api/checklist', authenticate, checklistRouter);
app.use('/api/webhooks', webhookAuth, webhooksRouter); 
app.use('/api/users', authenticate, usersRouter);
app.use('/api/friends', authenticate, friendshipRouter);
app.use('/api/notifications', authenticate, notificationRouter);
app.use('/api/messages', authenticate, messagingRouter);
app.use('/api/posts', authenticate, postsRouter);
app.use('/api/admin', adminRouter); // Admin routes have their own auth

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'TravelWise Server Root' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/testForEC2', (_req: Request, res: Response) => {
  res.json({ status: 'Has been deployed to ec2', timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR] Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const server = createServer(app);

const portToListen = Number(PORT);

server.listen(portToListen, '0.0.0.0', () => {
  console.log(`[SYSTEM] TravelWise Backend running on port ${portToListen}`);
  console.log(`[SYSTEM] Listening on all network interfaces (0.0.0.0)`);
  console.log(`[SYSTEM] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  socketService.initialize(server);
});

// timeout to 5 minutes for long AI generations
server.timeout = 300000;

export default app;

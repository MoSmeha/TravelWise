import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import { authenticate } from './middleware/auth.middleware.js';
import authRouter from './routes/auth.js';
import checklistRouter from './routes/checklist.js';
import itineraryRouter from './routes/itinerary.js';
import placesRouter from './routes/places.js';
import ragRouter from './routes/rag.js';
import webhooksRouter from './routes/webhooks.js';
import usersRouter from './routes/users.js';
import friendshipRouter from './routes/friendship.js';
import notificationRouter from './routes/notifications.js';
import messagingRouter from './routes/messaging.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ 
    message: 'TravelWise API is running', 
    endpoints: ['/auth', '/itinerary', '/places', '/checklist', '/webhooks'],
  });
});

app.use('/api/auth', authRouter);
app.use('/api/itinerary', authenticate, itineraryRouter);
app.use('/api/itinerary', authenticate, ragRouter); // RAG endpoints under /api/itinerary/:id/ask
app.use('/api/places', authenticate, placesRouter);
app.use('/api/checklist', authenticate, checklistRouter);
app.use('/api/webhooks', authenticate, webhooksRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/friends', authenticate, friendshipRouter);
app.use('/api/notifications', authenticate, notificationRouter);
app.use('/api/messages', authenticate, messagingRouter);

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'TravelWise Server Root' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR] Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

import { createServer } from 'http';
import { socketService } from './services/socket.service.js';

const server = createServer(app);

const portToListen = Number(PORT);

server.listen(portToListen, '0.0.0.0', () => {
  console.log(`[SYSTEM] TravelWise Backend running on port ${portToListen}`);
  console.log(`[SYSTEM] Listening on all network interfaces (0.0.0.0)`);
  console.log(`[SYSTEM] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize Socket.IO
  socketService.initialize(server);
});

// Set timeout to 5 minutes for long AI generations
server.timeout = 300000;

export default app;

import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import checklistRouter from './routes/checklist';
import itineraryRouter from './routes/itinerary';
import locationsRouter from './routes/locations';
import placesRouter from './routes/places';
import ragRouter from './routes/rag';
import warningsRouter from './routes/warnings';
import webhooksRouter from './routes/webhooks';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ 
    message: 'TravelWise API is running', 
    endpoints: ['/itinerary', '/locations', '/warnings', '/places', '/webhooks'],
  });
});

app.use('/api/itinerary', itineraryRouter);
app.use('/api/itinerary', ragRouter); // RAG endpoints under /api/itinerary/:id/ask
app.use('/api/locations', locationsRouter);
app.use('/api/warnings', warningsRouter);
app.use('/api/places', placesRouter);
app.use('/api/checklist', checklistRouter);
app.use('/api/webhooks', webhooksRouter);

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
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const portToListen = Number(PORT);

const server = app.listen(portToListen, '0.0.0.0', () => {
  console.log(`🚀 TravelWise Backend running on port ${portToListen}`);
  console.log(`📍 Listening on all network interfaces (0.0.0.0)`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Set timeout to 5 minutes for long AI generations
server.timeout = 300000;

export default app;

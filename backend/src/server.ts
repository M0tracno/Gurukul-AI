import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import compression from 'compression';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { securityHeadersMiddleware, httpsRedirectMiddleware } from './middleware/securityHeaders.js';

// Import middleware
import { payloadTooLargeHandler, fieldSizeLimitMiddleware } from './middleware/requestSizeLimits.js';
import { performanceMonitorMiddleware } from './middleware/performanceMonitor.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { requireRoles } from './middleware/rbacMiddleware.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables - must be before importing config
dotenv.config({
  path: path.join(rootDir, '.env'),
});

// Import config and database
import { connectDB } from './config/database.js';
import { SocketManager } from './realtime/socketManager.js';
import { createGradingWorker } from './jobs/gradingWorker.js';
import { mountSwaggerDocs, swaggerUi, swaggerSpec } from './config/swagger.js';

// Use the new structured Winston logger with daily rotation and 30-day retention
import { logger, morganStream } from './utils/logger.js';

// Import routes
import {
  authRoutes,
  studentRoutes,
  courseRoutes,
  facultyRoutes,
  enrollmentRoutes,
  attendanceRoutes,
  markRoutes,
  gradingRoutes,
  metricsRoutes,
  healthRoutes,
  studentMeRoutes,
  parentMeRoutes,
} from './routes/index.js';

// Rate limiter configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// App configuration
const PORT = parseInt(process.env.PORT || '5000', 10);

// CORS: Allow FRONTEND_URL + any Vercel preview deployments
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow if it matches an allowed origin or is a Vercel preview URL
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  credentials: true,
};

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Apply CORS configuration - must be first
app.use(cors(corsOptions));

// Handle preflight requests (Express 5 uses '{*path}' instead of '*')
app.options('{*path}', cors(corsOptions));

// Other middleware
app.use(httpsRedirectMiddleware);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(payloadTooLargeHandler);
app.use(fieldSizeLimitMiddleware());
app.use(securityHeadersMiddleware);
app.use(performanceMonitorMiddleware());
app.use(morgan('combined', { stream: morganStream }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

// Setup Swagger (legacy endpoint at /api-docs)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Setup new OpenAPI v1 docs at /api/v1/docs
mountSwaggerDocs(app);

// Welcome route
app.get('/', (_req, res) => {
  res.send('Welcome to the Teacher Assistant API');
});

// Health check route (legacy)
app.get('/api/health-check', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

logger.info('Using MongoDB database exclusively');

// Socket.IO real-time messaging: JWT handshake auth, rooms, persistence-first delivery, missed-message sync
const socketManager = new SocketManager(io);

// Make io available to routes
app.set('io', io);
app.set('connectedUsers', socketManager.getConnectedUsers());

// Apply routes — all new TypeScript routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', markRoutes);

// Student & Parent self-service routes
app.use('/api/students', studentMeRoutes);
app.use('/api/parents', parentMeRoutes);

// Modernized v1 API routes
app.use('/api/v1/grading', gradingRoutes);

// Modernized health endpoint
app.use('/health', healthRoutes);

// Prometheus-compatible metrics endpoint
app.use('/', metricsRoutes);

// Debug routes endpoint - secured with authentication and admin role
// Only available in non-production environments
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug-routes', authMiddleware, requireRoles('admin'), (_req, res) => {
    const routes: Array<{ method: string; path: string }> = [];

    function split(thing: string | { fast_slash?: boolean }): string[] {
      if (typeof thing === 'string') {
        return thing.split('/');
      } else if ((thing as { fast_slash?: boolean }).fast_slash) {
        return [''];
      } else {
        const match = thing
          .toString()
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '$')
          .match(/^\^\\(\/(?:[^/\\()[\]\\?+*]*\\[^][^\\()[\]]*)*)/);
        return match ? match[1].replace(/\\(.)/g, '$1').split('/') : ['<complex>'];
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function print(currentPath: string[], layer: any) {
      if (layer.route) {
        layer.route.stack.forEach((l: unknown) => print(currentPath.concat(split(layer.route.path)), l));
      } else if (layer.name === 'router' && layer.handle?.stack) {
        layer.handle.stack.forEach((l: unknown) =>
          print(
            currentPath.concat(
              split(layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('\\^\\', '').replace('\\$', '')),
            ),
            l,
          ),
        );
      } else if (layer.method) {
        routes.push({
          method: layer.method.toUpperCase(),
          path: currentPath
            .concat(split(layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('\\^\\', '').replace('\\$', '')))
            .filter(Boolean)
            .join('/'),
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any)._router.stack.forEach((layer: unknown) => print([], layer));

    res.json(routes);
  });
}

// Add debug route before the 404 handler
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug-config', authMiddleware, requireRoles('admin'), (_req, res) => {
    res.json({
      dbType: 'mongodb',
      isMongoDb: true,
      envDbType: process.env.DB_TYPE,
      availableRoutes: {
        auth: !!authRoutes,
        faculty: !!facultyRoutes,
        student: !!studentRoutes,
      },
    });
  });
}

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');
    console.log('MongoDB connected successfully');

    // Consume AI grading jobs from the BullMQ queue; progress is pushed over Socket.IO
    createGradingWorker({ io });
    logger.info('Grading worker started');

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`Server running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error starting server: ${message}`);
    console.error(`Error starting server: ${message}`, error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server
});

export default app;

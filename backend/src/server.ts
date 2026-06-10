import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import compression from 'compression';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { securityHeadersMiddleware, httpsRedirectMiddleware } from './middleware/securityHeaders.js';

// Import middleware
import { payloadTooLargeHandler, fieldSizeLimitMiddleware } from './middleware/requestSizeLimits.js';
import { performanceMonitorMiddleware } from './middleware/performanceMonitor.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { success } from './utils/envelope.js';

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
  accountSetupRoutes,
  parentLinkageRoutes,
  facultyMeRoutes,
  adminDashboardRoutes,
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
  res.json(success({ message: 'Welcome to the Teacher Assistant API' }));
});

// Legacy health check removed (superseded by /health endpoint — Requirement 3.3)
// Debug endpoints (reset-seed-passwords, debug-users, seed-initial) removed as dead code — Requirement 3.3

logger.info('Using MongoDB database exclusively');

// Socket.IO Real-time Messaging Setup
interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
  lastSeen: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

// Socket.IO authentication middleware
const authenticateSocket = (
  socket: { handshake: { auth: { token?: string } }; user?: { id: string; role: string; firstName?: string; lastName?: string } },
  next: (err?: Error) => void,
) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
      firstName?: string;
      lastName?: string;
    };
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid authentication token'));
  }
};

io.use(authenticateSocket as Parameters<typeof io.use>[0]);

io.on('connection', (socket) => {
  const user = (socket as unknown as { user: { id: string; role: string; firstName?: string; lastName?: string } }).user;
  logger.info(`User ${user.id} (${user.role}) connected via Socket.IO`);

  // Store user connection
  connectedUsers.set(user.id, {
    socketId: socket.id,
    userId: user.id,
    role: user.role,
    lastSeen: new Date(),
  });

  // Join user to their personal room for direct messaging
  socket.join(`user_${user.id}`);

  // Handle joining conversation rooms
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation_${conversationId}`);
    logger.info(`User ${user.id} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation rooms
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation_${conversationId}`);
    logger.info(`User ${user.id} left conversation ${conversationId}`);
  });

  // Handle new message events
  socket.on('send_message', async (messageData: { conversationId: string; receiverId: string; _id: string }) => {
    try {
      // Emit to conversation room
      socket.to(`conversation_${messageData.conversationId}`).emit('new_message', messageData);

      // Emit to receiver's personal room
      socket.to(`user_${messageData.receiverId}`).emit('new_message', messageData);

      // Send delivery confirmation to sender
      socket.emit('message_delivered', { messageId: messageData._id });

      logger.info(`Message sent from ${user.id} to conversation ${messageData.conversationId}`);
    } catch (error) {
      logger.error('Error handling send_message event:', { error: error instanceof Error ? error.message : String(error) });
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      conversationId: data.conversationId,
    });
  });

  socket.on('typing_stop', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_stopped_typing', {
      userId: user.id,
      conversationId: data.conversationId,
    });
  });

  // Handle message read receipts
  socket.on('message_read', (data: { messageId: string; conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('message_read_by', {
      messageId: data.messageId,
      readBy: user.id,
      readAt: new Date(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`User ${user.id} (${user.role}) disconnected from Socket.IO`);
    connectedUsers.delete(user.id);
  });
});

// Make io available to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

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

// Faculty (teacher) self-service routes — mounted after facultyRoutes so the
// admin-management faculty routes take precedence; `/me/*` paths never collide.
app.use('/api/faculty', facultyMeRoutes);

// Public account-setup route (no auth — the setup token is the credential).
// express.json() is already applied globally above.
app.use('/api/account-setup', accountSetupRoutes);

// Admin-only parent-child linkage management (Requirement 7).
app.use('/api/admin/parent-linkages', parentLinkageRoutes);

// Admin dashboard summary (Requirements 2.1, 3.1).
app.use('/api/admin', adminDashboardRoutes);

// Modernized v1 API routes
app.use('/api/v1/grading', gradingRoutes);

// Modernized health endpoint
app.use('/health', healthRoutes);

// Prometheus-compatible metrics endpoint
app.use('/', metricsRoutes);

// Debug routes (/debug-routes, /api/debug-config) removed — superseded by
// buildRouteMap utility (Requirement 3.3, 3.4)

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

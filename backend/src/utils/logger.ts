/**
 * Structured logger utility.
 *
 * Uses Winston with daily-rotating file transports to provide:
 *  - JSON-structured log entries for production log aggregation
 *  - Daily file rotation with configurable 30-day retention
 *  - Searchability by timestamp, requestId, userId, endpoint, status
 *  - Separate error log file for quick error triage
 *
 * In non-production environments, logs are also emitted to the console with
 * colorized output for developer convenience.
 *
 * @see Requirements 11.5
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const _loggerFilename = fileURLToPath(import.meta.url);
const _loggerDirname = path.dirname(_loggerFilename);

// ─── Configuration ─────────────────────────────────────────────────────────────

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || path.resolve(_loggerDirname, '..', '..', 'logs');
const LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || '30d';
const LOG_MAX_FILE_SIZE = process.env.LOG_MAX_FILE_SIZE || '20m';
const LOG_COMPRESS = process.env.LOG_COMPRESS !== 'false';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─── Format ────────────────────────────────────────────────────────────────────

/**
 * Custom format that ensures all searchable fields are present at the top level
 * of each log entry for indexing and querying:
 *  - timestamp (ISO 8601)
 *  - requestId
 *  - userId
 *  - endpoint
 *  - status
 */
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Promote searchable fields from meta to top level if present
    if (info.requestId === undefined && info.correlationId) {
      info.requestId = info.correlationId;
    }
    return info;
  })(),
  winston.format.json(),
);

// ─── Transports ────────────────────────────────────────────────────────────────

/**
 * Combined log: all levels, rotated daily, 30-day retention.
 * File naming: combined-YYYY-MM-DD.log
 */
const combinedRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_MAX_FILE_SIZE,
  maxFiles: LOG_RETENTION_DAYS,
  zippedArchive: LOG_COMPRESS,
  level: LOG_LEVEL,
});

/**
 * Error log: error level only, rotated daily, 30-day retention.
 * File naming: error-YYYY-MM-DD.log
 */
const errorRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_MAX_FILE_SIZE,
  maxFiles: LOG_RETENTION_DAYS,
  zippedArchive: LOG_COMPRESS,
  level: 'error',
});

// ─── Winston Logger Instance ───────────────────────────────────────────────────

const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: structuredFormat,
  defaultMeta: { service: 'gurukul-ai-backend' },
  transports: [
    combinedRotateTransport,
    errorRotateTransport,
  ],
});

// In non-production, also log to console for developer convenience
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0
            ? ` ${JSON.stringify(meta)}`
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }),
      ),
    }),
  );
}

// ─── Public Logger Interface ───────────────────────────────────────────────────

export interface LogMeta {
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
}

/**
 * Application logger instance.
 *
 * All log entries are structured JSON containing at minimum:
 *  - level, message, timestamp, service
 *
 * When request context is available, entries also include:
 *  - requestId, userId, endpoint, status, method, responseTime
 *
 * Logs are stored in daily-rotated files with 30-day retention and are
 * searchable by: timestamp, requestId, userId, endpoint, status.
 */
export const logger: Logger = {
  info(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    winstonLogger.warn(message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    winstonLogger.error(message, meta);
  },
  debug(message: string, meta?: LogMeta): void {
    winstonLogger.debug(message, meta);
  },
};

/**
 * Morgan stream adapter for HTTP request logging.
 * Used by the Express morgan middleware to pipe access logs through Winston.
 */
export const morganStream = {
  write: (message: string): void => {
    winstonLogger.info(message.trim());
  },
};

// Export the underlying Winston instance for advanced use cases
// (e.g., adding custom transports in tests or specialized modules)
export { winstonLogger };

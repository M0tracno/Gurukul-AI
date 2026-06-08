/**
 * Logging configuration.
 *
 * Defines log retention, rotation, and searchability settings.
 * Logs are stored as structured JSON and rotated daily with 30-day retention.
 *
 * Searchable fields per log entry:
 *  - timestamp (ISO 8601)
 *  - requestId (correlation ID)
 *  - userId (authenticated user)
 *  - endpoint (request path)
 *  - status (HTTP response status code)
 *
 * @see Requirements 11.5
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoggingConfig {
  /** Minimum log level: 'debug' | 'info' | 'warn' | 'error' */
  level: string;
  /** Directory where log files are stored */
  directory: string;
  /** Number of days to retain log files */
  retentionDays: number;
  /** Maximum size per log file before rotation (e.g., '20m' for 20 MB) */
  maxFileSize: string;
  /** Date pattern for file rotation (YYYY-MM-DD = daily) */
  datePattern: string;
  /** Whether to compress rotated (archived) log files */
  compressArchives: boolean;
  /** Fields that must be present in every log entry for searchability */
  searchableFields: readonly string[];
}

export const loggingConfig: LoggingConfig = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  directory: process.env.LOG_DIR || path.resolve(__dirname, '..', '..', 'logs'),
  retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
  datePattern: 'YYYY-MM-DD',
  compressArchives: process.env.LOG_COMPRESS !== 'false',
  searchableFields: ['timestamp', 'requestId', 'userId', 'endpoint', 'status'] as const,
};

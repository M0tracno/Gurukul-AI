import mongoose, { ConnectOptions } from 'mongoose';

/**
 * Parse an environment variable as an integer with a default and optional bounds.
 */
function parsePoolSize(envValue: string | undefined, defaultValue: number, max: number): number {
  const parsed = parseInt(envValue ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }
  return Math.min(parsed, max);
}

/**
 * Mongoose connection options with configurable pool sizes.
 *
 * Environment variables:
 * - MONGO_MIN_POOL: minimum pool size (default 2)
 * - MONGO_MAX_POOL: maximum pool size (default 10, capped at 50)
 *
 * Timeout settings (Requirement 3.7):
 * - serverSelectionTimeoutMS: 30000 — time to find a suitable server
 * - socketTimeoutMS: 30000 — time for a socket operation to complete;
 *   queued operations that aren't served within this window will timeout.
 */
export function getMongooseOptions(): ConnectOptions {
  const minPoolSize = parsePoolSize(process.env.MONGO_MIN_POOL, 2, 50);
  const maxPoolSize = parsePoolSize(process.env.MONGO_MAX_POOL, 10, 50);

  return {
    minPoolSize: Math.max(minPoolSize, 2),
    maxPoolSize: Math.max(maxPoolSize, minPoolSize),
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  };
}

/**
 * Connect to MongoDB using the MONGO_URI environment variable
 * and the configured connection pool options.
 *
 * @returns The mongoose connection instance on success.
 * @throws Error if MONGO_URI is not set or connection fails.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    const error = new Error(
      'MONGO_URI environment variable is not defined. Cannot connect to MongoDB.',
    );
    console.error('[database] ' + error.message);
    throw error;
  }

  const options = getMongooseOptions();

  try {
    const connection = await mongoose.connect(uri, options);
    console.info(
      `[database] MongoDB connected: ${connection.connection.host} ` +
        `(pool: ${options.minPoolSize}-${options.maxPoolSize})`,
    );
    return connection;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[database] MongoDB connection failed: ${message}`);
    throw error;
  }
}

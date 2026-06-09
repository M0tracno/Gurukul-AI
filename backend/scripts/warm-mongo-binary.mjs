// Pre-downloads the mongodb-memory-server MongoDB binary into the local cache.
//
// Run this once before the Jest test step in CI. With the binary already
// cached, parallel Jest workers (maxWorkers > 1) reuse it instead of racing to
// download the same binary simultaneously — the download race was the reason
// the backend suite previously had to run with maxWorkers: 1.
import { MongoMemoryServer } from 'mongodb-memory-server';

const start = Date.now();
const server = await MongoMemoryServer.create();
await server.stop();
console.log(`mongodb-memory-server binary ready in ${Date.now() - start}ms`);

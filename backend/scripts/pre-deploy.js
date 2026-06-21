#!/usr/bin/env node

/**
 * Pre-deployment script to validate production readiness.
 * Run this before deploying to production to ensure everything is set up correctly.
 *
 * Compatible with the modernized ESM/TypeScript backend architecture.
 * Usage: node scripts/pre-deploy.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const log = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  warn: (msg) => console.warn(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  error: (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`),
};

let hasErrors = false;

log.info('🚀 Starting pre-deployment checks...\n');

// ─── 1. Check required environment variables ─────────────────────────────────

log.info('📋 Checking environment variables...');

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
];

const recommendedEnvVars = [
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL',
  'REDIS_HOST',
];

const missingRequired = requiredEnvVars.filter((v) => !process.env[v]);
const missingRecommended = recommendedEnvVars.filter((v) => !process.env[v]);

if (missingRequired.length > 0) {
  log.error(`Missing REQUIRED environment variables: ${missingRequired.join(', ')}`);
  hasErrors = true;
} else {
  log.success('All required environment variables present');
}

if (missingRecommended.length > 0) {
  log.warn(`Missing recommended variables (will use defaults): ${missingRecommended.join(', ')}`);
}

console.log('');

// ─── 2. Verify TypeScript compilation ────────────────────────────────────────

log.info('🔨 Checking TypeScript compilation...');

try {
  execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
  log.success('TypeScript compilation passed (npm run build)');
} catch (error) {
  log.error('TypeScript compilation failed. Run `npm run build` to see errors.');
  hasErrors = true;
}

console.log('');

// ─── 3. Verify dist output exists ───────────────────────────────────────────

log.info('📦 Checking build output...');

const distDir = path.join(rootDir, 'dist', 'src');
if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'server.js'))) {
  log.success('Build output exists (dist/src/server.js)');
} else {
  log.error('Build output missing. Run `npm run build` first.');
  hasErrors = true;
}

console.log('');

// ─── 4. Run route map compliance check ──────────────────────────────────────

log.info('🗺️  Checking route map compliance...');

try {
  execSync('npm run check:route-map', { cwd: rootDir, stdio: 'pipe' });
  log.success('Route map compliance check passed (no duplicate routes)');
} catch (error) {
  log.warn('Route map check failed or has warnings. Run `npm run check:route-map` for details.');
}

console.log('');

// ─── 5. Check for security vulnerabilities ──────────────────────────────────

log.info('🔍 Checking for security vulnerabilities...');

try {
  execSync('npm audit --omit=dev --audit-level=critical', { cwd: rootDir, stdio: 'pipe' });
  log.success('No critical security vulnerabilities found');
} catch (error) {
  log.warn('Security vulnerabilities detected. Run `npm audit` for details.');
}

console.log('');

// ─── 6. Ensure required directories exist ───────────────────────────────────

log.info('📁 Checking required directories...');

const requiredDirs = [
  path.join(rootDir, 'logs'),
  path.join(rootDir, 'uploads'),
  path.join(rootDir, 'uploads', 'profiles'),
  path.join(rootDir, 'uploads', 'course-materials'),
];

for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`  Created: ${path.relative(rootDir, dir)}/`);
  }
}

log.success('Required directories verified');

console.log('');

// ─── 7. Check Docker readiness ──────────────────────────────────────────────

log.info('🐳 Checking Docker readiness...');

if (fs.existsSync(path.join(rootDir, 'Dockerfile'))) {
  log.success('Backend Dockerfile present');
} else {
  log.warn('No Dockerfile found — manual deployment only');
}

console.log('');

// ─── 8. Summary ─────────────────────────────────────────────────────────────

console.log('─'.repeat(50));

if (hasErrors) {
  log.error('Pre-deployment checks FAILED. Fix the errors above before deploying.');
  process.exit(1);
} else {
  log.success('Pre-deployment checks PASSED!');
  log.info(`\n🚀 Ready to deploy in ${process.env.NODE_ENV || 'development'} mode`);

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n\x1b[33mHints for production:\x1b[0m');
    console.log('  • Set NODE_ENV=production');
    console.log('  • Configure MONGODB_URI for your production cluster');
    console.log('  • Configure REDIS_HOST for BullMQ grading queue');
    console.log('  • Set RECORDING_S3_BUCKET for PTM recordings');
    console.log('  • Use `node dist/src/server.js` (not tsx) in production');
  }

  process.exit(0);
}

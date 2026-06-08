/**
 * Smoke Test Script for Gurukul AI
 *
 * Runs basic smoke tests against a deployed environment to verify:
 *   1. Health check endpoint returns healthy status
 *   2. At least one API route responds successfully
 *   3. Frontend serves its entry page
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts [BASE_URL] [API_URL]
 *
 * Environment Variables (fallbacks if args not provided):
 *   SMOKE_TEST_BASE_URL  - Frontend URL (default: http://localhost:5173)
 *   SMOKE_TEST_API_URL   - Backend API URL (default: http://localhost:5000)
 *   SMOKE_TEST_TIMEOUT   - Request timeout in ms (default: 30000)
 *   SMOKE_TEST_RETRIES   - Number of retries per check (default: 3)
 *   SMOKE_TEST_RETRY_DELAY - Delay between retries in ms (default: 5000)
 *
 * Requirements: 10.2, 10.3, 10.7
 */

// ─── Configuration ────────────────────────────────────────────
const args = process.argv.slice(2);
const BASE_URL = args[0] || process.env.SMOKE_TEST_BASE_URL || 'http://localhost:5173';
const API_URL = args[1] || process.env.SMOKE_TEST_API_URL || 'http://localhost:5000';
const TIMEOUT = parseInt(process.env.SMOKE_TEST_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.SMOKE_TEST_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.SMOKE_TEST_RETRY_DELAY || '5000', 10);

// ─── Types ────────────────────────────────────────────────────
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  responseTime?: number;
}

interface SmokeTestConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

// ─── Helpers ──────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<{ status: number; body: string; ok: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    clearTimeout(timeoutId);
    return { status: response.status, body, ok: response.ok };
  } catch (error) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Request to ${url} failed: ${message}`);
  }
}

async function retryFetch(
  url: string,
  config: SmokeTestConfig,
  expectedStatus = 200,
): Promise<{ status: number; body: string; ok: boolean }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    if (attempt > 1) {
      console.log(`    Retry ${attempt}/${config.maxRetries} (waiting ${config.retryDelay}ms)...`);
      await sleep(config.retryDelay);
    }

    try {
      const result = await fetchWithTimeout(url, config.timeout);
      if (result.status === expectedStatus) {
        return result;
      }
      lastError = new Error(`Expected status ${expectedStatus}, got ${result.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`Failed after ${config.maxRetries} retries`);
}

// ─── Test Functions ───────────────────────────────────────────

/**
 * Test 1: Health Check Endpoint
 * Verifies /health returns a healthy (or degraded) status
 */
async function testHealthCheck(config: SmokeTestConfig): Promise<TestResult> {
  const testName = 'Health check endpoint returns healthy';
  const url = `${config.apiUrl}/health`;
  console.log(`  → Testing: ${testName}`);
  console.log(`    URL: ${url}`);

  const start = Date.now();

  try {
    const result = await retryFetch(url, config);
    const responseTime = Date.now() - start;

    // Parse the status field from JSON response
    let status: string;
    try {
      const json = JSON.parse(result.body);
      status = json.status;
    } catch {
      return {
        name: testName,
        passed: false,
        message: 'Response is not valid JSON',
        responseTime,
      };
    }

    if (status === 'healthy' || status === 'degraded') {
      return {
        name: testName,
        passed: true,
        message: `Status: ${status}`,
        responseTime,
      };
    }

    return {
      name: testName,
      passed: false,
      message: `Unexpected status: "${status}"`,
      responseTime,
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - start,
    };
  }
}

/**
 * Test 2: API Route Responds
 * Verifies at least one API route responds successfully
 */
async function testApiRoute(config: SmokeTestConfig): Promise<TestResult> {
  const testName = 'At least one API route responds successfully';
  console.log(`  → Testing: ${testName}`);

  const start = Date.now();
  const endpoints = [
    `${config.apiUrl}/api/v1/docs`,
    `${config.apiUrl}/api/health-check`,
    `${config.apiUrl}/api/v1`,
  ];

  for (const url of endpoints) {
    console.log(`    Trying: ${url}`);
    try {
      const result = await retryFetch(url, config);
      if (result.ok) {
        return {
          name: testName,
          passed: true,
          message: `Responded via ${url}`,
          responseTime: Date.now() - start,
        };
      }
    } catch {
      // Try next endpoint
    }
  }

  return {
    name: testName,
    passed: false,
    message: 'No API routes responded successfully',
    responseTime: Date.now() - start,
  };
}

/**
 * Test 3: Frontend Serves Entry Page
 * Verifies the frontend URL serves an HTML page
 */
async function testFrontend(config: SmokeTestConfig): Promise<TestResult> {
  const testName = 'Frontend serves entry page';
  const url = config.baseUrl;
  console.log(`  → Testing: ${testName}`);
  console.log(`    URL: ${url}`);

  const start = Date.now();

  try {
    const result = await retryFetch(url, config);
    const responseTime = Date.now() - start;

    // Verify it's actually HTML content
    const isHtml =
      result.body.toLowerCase().includes('<html') ||
      result.body.toLowerCase().includes('<!doctype');

    if (isHtml) {
      return {
        name: testName,
        passed: true,
        message: 'HTML page served successfully',
        responseTime,
      };
    }

    return {
      name: testName,
      passed: false,
      message: 'Response is not HTML content',
      responseTime,
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - start,
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  const config: SmokeTestConfig = {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    timeout: TIMEOUT,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
  };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Gurukul AI — Smoke Tests');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Frontend URL: ${config.baseUrl}`);
  console.log(`  API URL:      ${config.apiUrl}`);
  console.log(`  Timeout:      ${config.timeout}ms per request`);
  console.log(`  Retries:      ${config.maxRetries} (delay: ${config.retryDelay}ms)`);
  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log('');

  const results: TestResult[] = [];

  // Run all tests
  results.push(await testHealthCheck(config));
  console.log('');
  results.push(await testApiRoute(config));
  console.log('');
  results.push(await testFrontend(config));
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');

  const failures = results.filter((r) => !r.passed);
  const passes = results.filter((r) => r.passed);

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`  ${icon} ${result.name}: ${result.message}${timeStr}`);
  }

  console.log('');
  console.log(`  Passed: ${passes.length}/${results.length}`);

  if (failures.length > 0) {
    console.log(`  Failed: ${failures.length}/${results.length}`);
    console.log('');

    // CI-friendly error annotations
    for (const result of failures) {
      console.log(`::error::Smoke test failed: ${result.name} - ${result.message}`);
    }

    process.exit(1);
  }

  console.log('');
  console.log('All smoke tests passed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error running smoke tests:', error);
  process.exit(1);
});

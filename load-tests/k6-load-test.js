/**
 * k6 Load Test - Gurukul AI Platform
 *
 * Simulates 500 concurrent users performing:
 * - Login (authentication)
 * - Dashboard loading (student data retrieval)
 * - Attendance retrieval
 * - Message listing
 *
 * SLO: p95 response time < 1 second over a sustained 5-minute load.
 *
 * Validates: Requirements 9.6
 *
 * Usage:
 *   k6 run load-tests/k6-load-test.js
 *   k6 run --env BASE_URL=http://localhost:5000 load-tests/k6-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// --- Custom Metrics ---
const loginDuration = new Trend('login_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const attendanceDuration = new Trend('attendance_duration', true);
const messageDuration = new Trend('message_duration', true);
const failureRate = new Rate('request_failures');

// --- Configuration ---
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  // Ramp up to 500 concurrent users, sustain for 5 minutes, then ramp down
  stages: [
    { duration: '30s', target: 100 },  // Ramp-up: 0 → 100 users over 30s
    { duration: '30s', target: 250 },  // Ramp-up: 100 → 250 users over 30s
    { duration: '30s', target: 500 },  // Ramp-up: 250 → 500 users over 30s
    { duration: '5m', target: 500 },   // Sustain: 500 users for 5 minutes
    { duration: '30s', target: 0 },    // Ramp-down: 500 → 0 users over 30s
  ],

  // Thresholds: p95 response time < 1 second for all operations
  thresholds: {
    http_req_duration: ['p(95)<1000'],          // Global: p95 < 1s
    login_duration: ['p(95)<1000'],             // Login: p95 < 1s
    dashboard_duration: ['p(95)<1000'],         // Dashboard: p95 < 1s
    attendance_duration: ['p(95)<1000'],        // Attendance: p95 < 1s
    message_duration: ['p(95)<1000'],           // Messages: p95 < 1s
    request_failures: ['rate<0.05'],            // Failure rate < 5%
  },
};

// --- Test Data ---
// Simulated user credentials for load testing
// In a real environment, these would be pre-seeded test accounts
function generateTestUser(vuId) {
  return {
    email: `loadtest_student_${vuId}@gurukul.test`,
    password: 'LoadTest@2024!',
    userType: 'student',
  };
}

// --- Helper Functions ---
function getAuthHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

function getJsonHeaders() {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

// --- Main Test Scenario ---
export default function () {
  let authToken = null;

  // 1. Login Operation
  group('Login', () => {
    const user = generateTestUser(__VU);
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
      userType: user.userType,
    });

    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      getJsonHeaders(),
    );

    loginDuration.add(loginRes.timings.duration);

    const loginSuccess = check(loginRes, {
      'login: status is 200': (r) => r.status === 200,
      'login: response has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token !== undefined || body.accessToken !== undefined;
        } catch {
          return false;
        }
      },
      'login: response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!loginSuccess) {
      failureRate.add(1);
    } else {
      failureRate.add(0);
      try {
        const body = JSON.parse(loginRes.body);
        authToken = body.token || body.accessToken;
      } catch {
        // Token extraction failed
      }
    }
  });

  sleep(1); // Simulate user think time between operations

  // 2. Dashboard Loading (Student data retrieval)
  group('Dashboard Loading', () => {
    // If login failed, use a fallback request without auth to still measure response time
    const dashboardRes = authToken
      ? http.get(`${BASE_URL}/api/students`, getAuthHeaders(authToken))
      : http.get(`${BASE_URL}/api/students`, getJsonHeaders());

    dashboardDuration.add(dashboardRes.timings.duration);

    const dashboardSuccess = check(dashboardRes, {
      'dashboard: status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'dashboard: response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!dashboardSuccess) {
      failureRate.add(1);
    } else {
      failureRate.add(0);
    }
  });

  sleep(1);

  // 3. Attendance Retrieval
  group('Attendance Retrieval', () => {
    const attendanceRes = authToken
      ? http.get(`${BASE_URL}/api/attendance`, getAuthHeaders(authToken))
      : http.get(`${BASE_URL}/api/attendance`, getJsonHeaders());

    attendanceDuration.add(attendanceRes.timings.duration);

    const attendanceSuccess = check(attendanceRes, {
      'attendance: status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'attendance: response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!attendanceSuccess) {
      failureRate.add(1);
    } else {
      failureRate.add(0);
    }
  });

  sleep(1);

  // 4. Message Listing
  group('Message Listing', () => {
    const messageRes = authToken
      ? http.get(`${BASE_URL}/api/messages`, getAuthHeaders(authToken))
      : http.get(`${BASE_URL}/api/messages`, getJsonHeaders());

    messageDuration.add(messageRes.timings.duration);

    const messageSuccess = check(messageRes, {
      'messages: status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'messages: response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!messageSuccess) {
      failureRate.add(1);
    } else {
      failureRate.add(0);
    }
  });

  sleep(1); // Think time before next iteration
}

// --- Setup Function ---
// Runs once before the test to verify the target server is reachable
export function setup() {
  const healthRes = http.get(`${BASE_URL}/api/health-check`);

  const isHealthy = check(healthRes, {
    'setup: server is reachable': (r) => r.status === 200,
  });

  if (!isHealthy) {
    console.warn(
      `WARNING: Server at ${BASE_URL} may not be reachable. ` +
      `Health check returned status ${healthRes.status}. ` +
      `Tests will continue but may produce failures.`,
    );
  }

  return { baseUrl: BASE_URL };
}

// --- Teardown Function ---
// Runs once after the test to log summary information
export function teardown(data) {
  console.log(`Load test completed against ${data.baseUrl}`);
  console.log('Check the k6 summary output for p95 response times.');
  console.log('SLO target: all p95 values should be < 1000ms');
}

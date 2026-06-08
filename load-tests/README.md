# Load Tests

Load tests for the Gurukul AI platform using [k6](https://k6.io/).

## Requirements

- [k6](https://k6.io/docs/get-started/installation/) installed locally
- Backend server running (default: `http://localhost:5000`)

## Installation

### Windows (via winget)

```bash
winget install k6 --source winget
```

### macOS (via Homebrew)

```bash
brew install k6
```

### Linux

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running the Load Test

### Default (against localhost:5000)

```bash
k6 run load-tests/k6-load-test.js
```

### Against a custom server

```bash
k6 run --env BASE_URL=http://your-server:5000 load-tests/k6-load-test.js
```

### Quick smoke test (reduced load)

```bash
k6 run --vus 10 --duration 30s load-tests/k6-load-test.js
```

## Test Scenario

The load test simulates **500 concurrent users** performing the following operations in sequence:

1. **Login** — POST `/api/auth/login`
2. **Dashboard Loading** — GET `/api/students`
3. **Attendance Retrieval** — GET `/api/attendance`
4. **Message Listing** — GET `/api/messages`

### Load Profile

| Phase       | Duration | Users |
|-------------|----------|-------|
| Ramp-up 1   | 30s      | 0→100 |
| Ramp-up 2   | 30s      | 100→250 |
| Ramp-up 3   | 30s      | 250→500 |
| **Sustain** | **5 min**| **500** |
| Ramp-down   | 30s      | 500→0 |

### SLO (Service Level Objectives)

- **p95 response time < 1 second** for all operations
- **Failure rate < 5%** across all requests

## Preparing Test Data

For meaningful load test results, pre-seed the database with test user accounts:

```javascript
// Example: Seed 500 test student accounts
// Email pattern: loadtest_student_{1-500}@gurukul.test
// Password: LoadTest@2024!
```

## Interpreting Results

After the test completes, k6 outputs a summary including:

- `http_req_duration` — Overall response time statistics
- `login_duration` — Login-specific response times
- `dashboard_duration` — Dashboard-specific response times
- `attendance_duration` — Attendance-specific response times
- `message_duration` — Message listing response times
- `request_failures` — Percentage of failed requests

All thresholds must pass (shown as ✓) for the SLO to be met.

## CI Integration

Add to your CI pipeline:

```yaml
- name: Run Load Tests
  run: |
    k6 run --out json=load-test-results.json load-tests/k6-load-test.js
```

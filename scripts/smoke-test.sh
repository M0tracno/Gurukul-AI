#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Smoke Test Script for Gurukul AI
# ─────────────────────────────────────────────────────────────
# Runs basic smoke tests against a deployed environment to verify:
#   1. Health check endpoint returns healthy status
#   2. At least one API route responds successfully
#   3. Frontend serves its entry page
#
# Usage:
#   ./scripts/smoke-test.sh [BASE_URL] [API_URL]
#
# Environment Variables (fallbacks if args not provided):
#   SMOKE_TEST_BASE_URL  - Frontend URL (default: http://localhost:5173)
#   SMOKE_TEST_API_URL   - Backend API URL (default: http://localhost:5000)
#   SMOKE_TEST_TIMEOUT   - Request timeout in seconds (default: 30)
#   SMOKE_TEST_RETRIES   - Number of retries per check (default: 3)
#   SMOKE_TEST_RETRY_DELAY - Delay between retries in seconds (default: 5)
#
# Exit codes:
#   0 - All smoke tests passed
#   1 - One or more smoke tests failed
#
# Requirements: 10.2, 10.3, 10.7
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────
BASE_URL="${1:-${SMOKE_TEST_BASE_URL:-http://localhost:5173}}"
API_URL="${2:-${SMOKE_TEST_API_URL:-http://localhost:5000}}"
TIMEOUT="${SMOKE_TEST_TIMEOUT:-30}"
MAX_RETRIES="${SMOKE_TEST_RETRIES:-3}"
RETRY_DELAY="${SMOKE_TEST_RETRY_DELAY:-5}"

# ─── Output helpers ──────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

# ─── State ───────────────────────────────────────────────────
FAILURES=0
RESULTS=()

# ─── Retry wrapper ───────────────────────────────────────────
# Usage: retry_curl <test_name> <url> [expected_status]
# Retries a curl request up to MAX_RETRIES times with RETRY_DELAY between attempts.
retry_curl() {
  local test_name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local attempt=0
  local status_code=""
  local response_body=""

  while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))

    if [ $attempt -gt 1 ]; then
      info "Retry $attempt/$MAX_RETRIES for: $test_name (waiting ${RETRY_DELAY}s)..."
      sleep "$RETRY_DELAY"
    fi

    # Capture both status code and body
    response_body=$(curl --silent --max-time "$TIMEOUT" --write-out "\n%{http_code}" "$url" 2>/dev/null || echo "CURL_FAILED")

    if [ "$response_body" = "CURL_FAILED" ]; then
      status_code="000"
    else
      status_code=$(echo "$response_body" | tail -n1)
      response_body=$(echo "$response_body" | sed '$d')
    fi

    if [ "$status_code" = "$expected_status" ]; then
      echo "$response_body"
      return 0
    fi
  done

  # All retries exhausted
  echo "$response_body"
  return 1
}

# ─────────────────────────────────────────────────────────────
# Test 1: Health Check Endpoint
# Verifies /health returns a healthy (or degraded) status
# ─────────────────────────────────────────────────────────────
run_health_check() {
  local test_name="Health check endpoint returns healthy"
  info "Testing: $test_name"
  info "URL: $API_URL/health"

  local response
  if response=$(retry_curl "$test_name" "$API_URL/health" "200"); then
    # Parse the status field from JSON response
    local status
    status=$(echo "$response" | grep -o '"status"\s*:\s*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

    if [ "$status" = "healthy" ] || [ "$status" = "degraded" ]; then
      pass "$test_name (status: $status)"
      RESULTS+=("PASS: $test_name")
      return 0
    else
      fail "$test_name (unexpected status: '$status')"
      RESULTS+=("FAIL: $test_name - unexpected status: $status")
      FAILURES=$((FAILURES + 1))
      return 1
    fi
  else
    fail "$test_name (endpoint unreachable or returned error)"
    RESULTS+=("FAIL: $test_name - endpoint unreachable or non-200 status")
    FAILURES=$((FAILURES + 1))
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────
# Test 2: API Route Responds
# Verifies at least one API route responds (tries /api/v1/docs, then /api/health-check)
# ─────────────────────────────────────────────────────────────
run_api_check() {
  local test_name="At least one API route responds successfully"
  info "Testing: $test_name"

  # Try the OpenAPI docs endpoint first
  info "URL: $API_URL/api/v1/docs"
  local response
  if response=$(retry_curl "$test_name" "$API_URL/api/v1/docs" "200"); then
    pass "$test_name (via /api/v1/docs)"
    RESULTS+=("PASS: $test_name")
    return 0
  fi

  # Fallback: try the legacy health check endpoint
  info "Falling back to: $API_URL/api/health-check"
  if response=$(retry_curl "$test_name" "$API_URL/api/health-check" "200"); then
    pass "$test_name (via /api/health-check)"
    RESULTS+=("PASS: $test_name")
    return 0
  fi

  # Fallback: try just the root API path
  info "Falling back to: $API_URL/api/v1"
  if response=$(retry_curl "$test_name" "$API_URL/api/v1" "200"); then
    pass "$test_name (via /api/v1)"
    RESULTS+=("PASS: $test_name")
    return 0
  fi

  fail "$test_name (no API routes responded)"
  RESULTS+=("FAIL: $test_name - no API routes responded successfully")
  FAILURES=$((FAILURES + 1))
  return 1
}

# ─────────────────────────────────────────────────────────────
# Test 3: Frontend Serves Entry Page
# Verifies the frontend URL serves an HTML page
# ─────────────────────────────────────────────────────────────
run_frontend_check() {
  local test_name="Frontend serves entry page"
  info "Testing: $test_name"
  info "URL: $BASE_URL"

  local response
  if response=$(retry_curl "$test_name" "$BASE_URL" "200"); then
    # Verify it's actually HTML content (contains <html or <!DOCTYPE)
    if echo "$response" | grep -qi '<html\|<!doctype'; then
      pass "$test_name"
      RESULTS+=("PASS: $test_name")
      return 0
    else
      fail "$test_name (response is not HTML)"
      RESULTS+=("FAIL: $test_name - response is not HTML content")
      FAILURES=$((FAILURES + 1))
      return 1
    fi
  else
    fail "$test_name (frontend unreachable or returned error)"
    RESULTS+=("FAIL: $test_name - frontend unreachable or non-200 status")
    FAILURES=$((FAILURES + 1))
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────
# Main Execution
# ─────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo "  Gurukul AI — Smoke Tests"
echo "═══════════════════════════════════════════════════════════"
echo ""
info "Frontend URL: $BASE_URL"
info "API URL:      $API_URL"
info "Timeout:      ${TIMEOUT}s per request"
info "Retries:      $MAX_RETRIES (delay: ${RETRY_DELAY}s)"
echo ""
echo "───────────────────────────────────────────────────────────"

# Run all tests (don't exit on individual failure)
set +e
run_health_check
echo ""
run_api_check
echo ""
run_frontend_check
set -e

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════════"
for result in "${RESULTS[@]}"; do
  if [[ "$result" == PASS:* ]]; then
    echo -e "  ${GREEN}✓${NC} ${result#PASS: }"
  else
    echo -e "  ${RED}✗${NC} ${result#FAIL: }"
  fi
done
echo ""

if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}All smoke tests passed.${NC}"
  exit 0
else
  echo -e "${RED}${FAILURES} smoke test(s) failed.${NC}"
  # Output machine-readable failure list for CI
  echo ""
  echo "::error::Smoke tests failed: $FAILURES test(s) did not pass"
  for result in "${RESULTS[@]}"; do
    if [[ "$result" == FAIL:* ]]; then
      echo "::error::  ${result}"
    fi
  done
  exit 1
fi

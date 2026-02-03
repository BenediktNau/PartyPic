/**
 * k6 Load Test Script for PartyPic Application
 *
 * This script tests the autoscaling behavior of the PartyPic application
 * by simulating realistic user traffic patterns.
 *
 * Build: npm run build
 * Run:   k6 run dist/loadtest.js
 */

import http, { RefinedResponse, ResponseType } from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { Options } from 'k6/options';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://app.100.50.133.182.nip.io';
const API_URL = __ENV.API_URL || 'http://api.100.50.133.182.nip.io';

// Test user interface
interface TestUser {
  username: string;
  password: string;
}

// Test scenarios for autoscaling demonstration
export const options: Options = {
  scenarios: {
    // Scenario 1: Ramp-up test to trigger HPA scaling
    ramp_up_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Warm-up: 0 -> 10 users
        { duration: '1m', target: 50 },    // Ramp-up: 10 -> 50 users
        { duration: '2m', target: 100 },   // Peak load: 50 -> 100 users
        { duration: '2m', target: 100 },   // Sustained peak: stay at 100
        { duration: '1m', target: 50 },    // Scale-down: 100 -> 50 users
        { duration: '30s', target: 0 },    // Cool-down: 50 -> 0 users
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    errors: ['rate<0.1'],                // Error rate under 10%
    http_req_failed: ['rate<0.1'],       // HTTP failures under 10%
  },
};

// Simulated user credentials for testing
const testUsers: TestUser[] = [
  { username: 'testuser1', password: 'password123' },
  { username: 'testuser2', password: 'password123' },
  { username: 'loadtest', password: 'loadtest123' },
];

// Helper function for random sleep intervals
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Main test function
export default function (): void {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  group('Frontend Load', () => {
    // Test 1: Load main page (tests nginx/static content)
    const mainPageRes: RefinedResponse<ResponseType> = http.get(BASE_URL, {
      tags: { name: 'MainPage' },
    });

    check(mainPageRes, {
      'Main page status is 200': (r) => r.status === 200,
      'Main page loads fast': (r) => r.timings.duration < 1000,
    });

    errorRate.add(mainPageRes.status !== 200);
    requestDuration.add(mainPageRes.timings.duration);
    if (mainPageRes.status === 200) successfulRequests.add(1);

    sleep(randomBetween(0.5, 1));
  });

  group('API Load', () => {
    // Test 2: Health check endpoint
    const healthRes = http.get(`${API_URL}/`, {
      tags: { name: 'HealthCheck' },
    });

    check(healthRes, {
      'API health check returns 200': (r) => r.status === 200,
    });

    errorRate.add(healthRes.status !== 200);
    if (healthRes.status === 200) successfulRequests.add(1);

    sleep(randomBetween(0.3, 0.7));

    // Test 3: Attempt login (will fail without valid user, but stresses auth service)
    const loginPayload = JSON.stringify({
      username: user.username,
      password: user.password,
    });

    const loginRes = http.post(`${API_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    });

    // Even if login fails (401), we're testing the server can handle the load
    check(loginRes, {
      'Login endpoint responds': (r) => r.status === 200 || r.status === 401,
    });

    requestDuration.add(loginRes.timings.duration);

    sleep(randomBetween(0.5, 1.5));
  });

  group('Session Operations', () => {
    // Test 4: Get public sessions (read operation)
    const sessionsRes = http.get(`${API_URL}/sessions`, {
      tags: { name: 'GetSessions' },
    });

    check(sessionsRes, {
      'Sessions endpoint responds': (r) => r.status === 200 || r.status === 401,
    });

    if (sessionsRes.status === 200) successfulRequests.add(1);

    sleep(randomBetween(0.5, 2));
  });

  group('Metrics Endpoint', () => {
    // Test 5: Prometheus metrics (used for monitoring)
    const metricsRes = http.get(`${API_URL}/metrics`, {
      tags: { name: 'Metrics' },
    });

    check(metricsRes, {
      'Metrics endpoint responds': (r) => r.status === 200,
      'Metrics contain prometheus format': (r) =>
        r.body !== null && typeof r.body === 'string' && r.body.includes('partypic_'),
    });

    if (metricsRes.status === 200) successfulRequests.add(1);

    sleep(randomBetween(1, 3));
  });
}

// Setup data interface
interface SetupData {
  startTime: string;
}

// Setup function - runs once before the test
export function setup(): SetupData {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              PartyPic Load Test - Autoscaling Demo             ║
╠════════════════════════════════════════════════════════════════╣
║  Frontend URL: ${BASE_URL.padEnd(44)}║
║  API URL:      ${API_URL.padEnd(44)}║
╠════════════════════════════════════════════════════════════════╣
║  Scenario: Ramp-up test for HPA scaling demonstration          ║
║  - Warm-up:       30s  (0 -> 10 VUs)                           ║
║  - Ramp-up:       1m   (10 -> 50 VUs)                          ║
║  - Peak Load:     2m   (50 -> 100 VUs)                         ║
║  - Sustained:     2m   (100 VUs)                               ║
║  - Scale-down:    1m   (100 -> 50 VUs)                         ║
║  - Cool-down:     30s  (50 -> 0 VUs)                           ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Verify endpoints are reachable
  const frontendCheck = http.get(BASE_URL);
  const apiCheck = http.get(API_URL);

  if (frontendCheck.status !== 200) {
    console.warn(`⚠️  Frontend not reachable: ${frontendCheck.status}`);
  }
  if (apiCheck.status !== 200) {
    console.warn(`⚠️  API not reachable: ${apiCheck.status}`);
  }

  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after the test
export function teardown(data: SetupData): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Load Test Complete                          ║
╠════════════════════════════════════════════════════════════════╣
║  Started:  ${data.startTime.padEnd(48)}║
║  Finished: ${new Date().toISOString().padEnd(48)}║
╠════════════════════════════════════════════════════════════════╣
║  Check Grafana for scaling metrics:                            ║
║  - Pod replica count changes                                   ║
║  - CPU/Memory utilization                                      ║
║  - Request rate and latency                                    ║
╚════════════════════════════════════════════════════════════════╝
  `);
}

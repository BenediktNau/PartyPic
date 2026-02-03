/**
 * k6 Stress Test Script for PartyPic - Quick HPA Trigger
 *
 * This script rapidly increases load to trigger HPA scaling quickly.
 * Use this for demonstrations when you want to see pods scale fast.
 *
 * Build: npm run build
 * Run:   k6 run dist/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { Options } from 'k6/options';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://app.100.50.133.182.nip.io';
const API_URL = __ENV.API_URL || 'http://api.100.50.133.182.nip.io';

export const options: Options = {
  scenarios: {
    // Quick spike to trigger immediate scaling
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },   // Quick ramp to 50
        { duration: '20s', target: 200 },  // Spike to 200 VUs
        { duration: '2m', target: 200 },   // Hold at 200 (triggers HPA)
        { duration: '1m', target: 300 },   // Push harder
        { duration: '2m', target: 300 },   // Sustained high load
        { duration: '30s', target: 0 },    // Drop to 0
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Allow slower responses under stress
    errors: ['rate<0.3'],                // Allow higher error rate under stress
  },
};

export default function (): void {
  // Hammer the API with rapid requests
  const responses = http.batch([
    ['GET', BASE_URL, null, { tags: { name: 'Frontend' } }],
    ['GET', `${API_URL}/`, null, { tags: { name: 'API-Health' } }],
    ['GET', `${API_URL}/metrics`, null, { tags: { name: 'API-Metrics' } }],
  ]);

  responses.forEach((res) => {
    errorRate.add(res.status >= 400);
  });

  // Minimal sleep to maximize requests/second
  sleep(0.1);

  // Additional CPU-intensive auth requests
  const loginPayload = JSON.stringify({
    username: 'stresstest',
    password: 'stresstest123',
  });

  http.post(`${API_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });

  sleep(0.1);
}

export function setup(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          PartyPic STRESS TEST - Quick HPA Trigger         ║
╠═══════════════════════════════════════════════════════════╣
║  ⚠️  This test uses HIGH LOAD to force rapid scaling!      ║
║                                                           ║
║  Watch these commands in another terminal:                ║
║    kubectl get hpa -w                                     ║
║    kubectl get pods -w                                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

export function teardown(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   Stress Test Complete                    ║
╠═══════════════════════════════════════════════════════════╣
║  Monitor scale-down behavior with:                        ║
║    kubectl get hpa -w                                     ║
║                                                           ║
║  Scale-down may take 5+ minutes (stabilization window)    ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

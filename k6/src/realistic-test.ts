/**
 * k6 Realistic User Flow Test for PartyPic
 *
 * This script simulates real users:
 * 1. Register account
 * 2. Login
 * 3. Create session (as host) OR join session (as guest)
 * 4. Upload photos
 * 5. Send heartbeats
 *
 * Build: npm run build
 * Run:   k6 run dist/realistic-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { Options } from 'k6/options';

// Custom metrics
const registrationSuccess = new Counter('registrations_success');
const loginSuccess = new Counter('logins_success');
const sessionCreated = new Counter('sessions_created');
const photoUploaded = new Counter('photos_uploaded');
const heartbeatsSent = new Counter('heartbeats_sent');
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Configuration
const API_URL = __ENV.API_URL || 'http://api.52.7.172.243.nip.io';

// Test configuration - realistic user simulation
export const options: Options = {
  scenarios: {
    realistic_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },    // 5 users registering
        { duration: '1m', target: 20 },    // 20 users active
        { duration: '2m', target: 50 },    // 50 users - party mode
        { duration: '2m', target: 50 },    // Sustained party
        { duration: '1m', target: 20 },    // Party winding down
        { duration: '30s', target: 0 },    // Everyone leaves
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.2'],
  },
};

// Generate unique user data for each VU
function generateUserData(vuId: number, iteration: number): { username: string; email: string; password: string } {
  const timestamp = Date.now();
  const uniqueId = `${vuId}_${iteration}_${timestamp}`;
  return {
    username: `testuser_${uniqueId}`,
    email: `test_${uniqueId}@loadtest.local`,
    password: 'TestPassword123!',
  };
}

// Helper to make authenticated requests
function authRequest(method: string, url: string, body: object | null, token: string): http.Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = { headers };
  
  if (method === 'GET') {
    return http.get(url, params);
  } else if (method === 'POST') {
    return http.post(url, body ? JSON.stringify(body) : null, params);
  }
  return http.get(url, params);
}

// Generate a small test image (1x1 pixel JPEG)
function generateTestImage(): ArrayBuffer {
  // Minimal valid JPEG (1x1 red pixel)
  const jpegHex = 'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fdfca28a2800a28a2803ffd9';
  const bytes = new Uint8Array(jpegHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return bytes.buffer;
}

// State tracking per VU
interface VUState {
  token: string | null;
  userId: string | null;
  sessionId: string | null;
  sessionUserId: string | null;
}

// VU-local state
const vuState: VUState = {
  token: null,
  userId: null,
  sessionId: null,
  sessionUserId: null,
};

// Main test function - simulates a complete user journey
export default function (): void {
  const vuId = __VU;
  const iteration = __ITER;
  const userData = generateUserData(vuId, iteration);

  // ========================================
  // PHASE 1: Registration
  // ========================================
  group('1. User Registration', () => {
    const registerRes = http.post(
      `${API_URL}/auth/register`,
      JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password,
      }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Register' } }
    );

    const regSuccess = check(registerRes, {
      'Registration successful (201/200)': (r) => r.status === 201 || r.status === 200,
    });

    if (regSuccess) {
      registrationSuccess.add(1);
    }
    errorRate.add(!regSuccess);
    apiLatency.add(registerRes.timings.duration);

    sleep(1);
  });

  // ========================================
  // PHASE 2: Login
  // ========================================
  group('2. User Login', () => {
    const loginRes = http.post(
      `${API_URL}/auth/login`,
      JSON.stringify({
        email: userData.email,
        password: userData.password,
      }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Login' } }
    );

    const loginOk = check(loginRes, {
      'Login successful': (r) => r.status === 200 || r.status === 201,
      'Token received': (r) => {
        try {
          const body = JSON.parse(r.body as string);
          return body.access_token !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (loginOk) {
      loginSuccess.add(1);
      try {
        const body = JSON.parse(loginRes.body as string);
        vuState.token = body.access_token;
        vuState.userId = body.user_id || body.userId || body.sub;
      } catch {
        // ignore parse errors
      }
    }
    errorRate.add(!loginOk);
    apiLatency.add(loginRes.timings.duration);

    sleep(0.5);
  });

  // Skip remaining phases if login failed
  if (!vuState.token) {
    console.log(`VU ${vuId}: Login failed, skipping remaining phases`);
    sleep(2);
    return;
  }

  // ========================================
  // PHASE 3: Create or Join Session
  // ========================================
  group('3. Session Management', () => {
    // 50% chance to create a session, 50% to join existing
    const isHost = Math.random() > 0.5;

    if (isHost) {
      // Create a new session
      const createRes = authRequest('POST', `${API_URL}/sessions/create`, {}, vuState.token!);

      const createOk = check(createRes, {
        'Session created': (r) => r.status === 200 || r.status === 201,
      });

      if (createOk) {
        sessionCreated.add(1);
        try {
          const body = JSON.parse(createRes.body as string);
          vuState.sessionId = body.sessionId;
        } catch {
          // ignore
        }
      }
      apiLatency.add(createRes.timings.duration);
    }

    // If we have a session, register as session user
    if (vuState.sessionId) {
      const regUserRes = http.post(
        `${API_URL}/sessions/registerSessionUser`,
        JSON.stringify({
          username: userData.username,
          sessionId: vuState.sessionId,
        }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'RegisterSessionUser' } }
      );

      check(regUserRes, {
        'Session user registered': (r) => r.status === 200 || r.status === 201,
      });

      try {
        const body = JSON.parse(regUserRes.body as string);
        vuState.sessionUserId = body.id || body.userId;
      } catch {
        // ignore
      }
      apiLatency.add(regUserRes.timings.duration);
    }

    sleep(1);
  });

  // ========================================
  // PHASE 4: Simulate Party Activity
  // ========================================
  group('4. Party Activity (Photos & Heartbeats)', () => {
    // Simulate 3-5 activities during the party
    const activityCount = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < activityCount; i++) {
      // Send heartbeat (every activity)
      if (vuState.sessionUserId) {
        const heartbeatRes = http.post(
          `${API_URL}/sessions/heartbeat`,
          JSON.stringify({ userId: vuState.sessionUserId }),
          { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Heartbeat' } }
        );

        if (heartbeatRes.status === 200) {
          heartbeatsSent.add(1);
        }
      }

      // 60% chance to upload a photo
      if (vuState.sessionId && Math.random() > 0.4) {
        // Step 1: Init upload
        const initRes = http.post(
          `${API_URL}/pictures/init-upload`,
          JSON.stringify({
            session_id: vuState.sessionId,
            mimetype: 'image/jpeg',
          }),
          { headers: { 'Content-Type': 'application/json' }, tags: { name: 'InitUpload' } }
        );

        if (initRes.status === 200 || initRes.status === 201) {
          try {
            const initBody = JSON.parse(initRes.body as string);
            const uploadUrl = initBody.uploadUrl;
            const s3Key = initBody.key;

            if (uploadUrl && s3Key) {
              // Step 2: Upload to S3 (simulate with small data)
              const imageData = generateTestImage();
              const uploadRes = http.put(uploadUrl, imageData, {
                headers: { 'Content-Type': 'image/jpeg' },
                tags: { name: 'S3Upload' },
              });

              if (uploadRes.status === 200) {
                // Step 3: Finalize upload
                const finalizeRes = http.post(
                  `${API_URL}/pictures/finalize-upload`,
                  JSON.stringify({
                    u_name: userData.username,
                    session_id: vuState.sessionId,
                    s3_key: s3Key,
                    original_filename: `party_photo_${Date.now()}.jpg`,
                    filesize_bytes: imageData.byteLength,
                    mimetype: 'image/jpeg',
                  }),
                  { headers: { 'Content-Type': 'application/json' }, tags: { name: 'FinalizeUpload' } }
                );

                if (finalizeRes.status === 200 || finalizeRes.status === 201) {
                  photoUploaded.add(1);
                }
              }
            }
          } catch {
            // ignore upload errors
          }
        }
      }

      // Random delay between activities (2-5 seconds, like a real user)
      sleep(Math.random() * 3 + 2);
    }
  });

  // ========================================
  // PHASE 5: View Gallery
  // ========================================
  group('5. View Gallery', () => {
    if (vuState.sessionId) {
      const galleryRes = http.get(
        `${API_URL}/pictures/session?sessionId=${vuState.sessionId}`,
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'GetGallery' } }
      );

      check(galleryRes, {
        'Gallery loaded': (r) => r.status === 200,
      });
      apiLatency.add(galleryRes.timings.duration);
    }

    sleep(1);
  });

  // Final heartbeat before "leaving"
  if (vuState.sessionUserId) {
    http.post(
      `${API_URL}/sessions/heartbeat`,
      JSON.stringify({ userId: vuState.sessionUserId }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Heartbeat' } }
    );
    heartbeatsSent.add(1);
  }

  // Reset state for next iteration
  vuState.token = null;
  vuState.userId = null;
  vuState.sessionId = null;
  vuState.sessionUserId = null;

  sleep(1);
}

// Setup function
export function setup(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           PartyPic Realistic User Flow Test                    ║
╠════════════════════════════════════════════════════════════════╣
║  API URL: ${API_URL.padEnd(52)}║
╠════════════════════════════════════════════════════════════════╣
║  Simulating real user journeys:                                ║
║  1. Register new account                                       ║
║  2. Login                                                      ║
║  3. Create/Join session                                        ║
║  4. Upload photos                                              ║
║  5. Send heartbeats                                            ║
║  6. View gallery                                               ║
╠════════════════════════════════════════════════════════════════╣
║  Metrics to watch in Grafana:                                  ║
║  - partypic_active_sessions                                    ║
║  - partypic_users_online                                       ║
║  - partypic_photos_uploaded_total                              ║
║  - partypic_http_requests_total                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Verify API is reachable
  const healthCheck = http.get(`${API_URL}/`);
  if (healthCheck.status !== 200) {
    console.warn(`⚠️  API not reachable: ${healthCheck.status}`);
  } else {
    console.log('✅ API is reachable');
  }
}

// Teardown function
export function teardown(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 Realistic Test Complete                        ║
╠════════════════════════════════════════════════════════════════╣
║  Check Grafana dashboards for:                                 ║
║  - Active sessions created                                     ║
║  - Online users (via heartbeats)                               ║
║  - Photos uploaded                                             ║
║  - Request patterns per endpoint                               ║
╚════════════════════════════════════════════════════════════════╝
  `);
}

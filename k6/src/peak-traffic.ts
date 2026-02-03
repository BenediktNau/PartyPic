/*
 * peak-traffic.ts
 * 
 * Stress-Test um HPA und Cluster Autoscaler zu triggern.
 * Kein DDoS - alles echte User-Flows, nur halt viele gleichzeitig.
 * 
 * Ziel: Server von 2 auf 25 Pods hochskalieren.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Config - IP anpassen!
const BASE_URL = 'http://api.52.7.172.243.nip.io';

// Metriken
const registrations = new Counter('registrations_success');
const logins = new Counter('logins_success');
const sessionsCreated = new Counter('sessions_created');
const photosUploaded = new Counter('photos_uploaded');
const heartbeats = new Counter('heartbeats_sent');
const responseTime = new Trend('response_time_ms');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    // User Journey - schnell durchlaufen
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 150 },
        { duration: '2m', target: 300 },  // ab hier sollte HPA reagieren
        { duration: '3m', target: 400 },  // maximale Last
        { duration: '2m', target: 200 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'userFlow',
    },
    // Viele Sessions erstellen (CPU-lastig wegen bcrypt)
    session_creators: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '8m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'createSessionFlow',
      startTime: '30s',
    },
    // Foto-Uploads (I/O lastig)
    photo_uploaders: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '7m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      exec: 'photoUploadFlow',
      startTime: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],     // unter Last akzeptieren wir mehr Fehler
    http_req_duration: ['p(95)<5000'],
    error_rate: ['rate<0.15'],
  },
};

// Pool von Sessions für die Photo-Uploader
const sessions: string[] = [];

// --- Helper ---

function generateEmail(): string {
  const vu = __VU || 0;
  return `peak_${vu}_${Date.now()}_${Math.random().toString(36).substring(7)}@load.test`;
}

function getHeaders(token?: string): { [key: string]: string } {
  const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function generateSmallPhoto(): string {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

function getRandomSession(): string | null {
  if (sessions.length === 0) return null;
  return sessions[Math.floor(Math.random() * sessions.length)];
}

// --- User Flow (schnell) ---

export function userFlow() {
  const email = generateEmail();
  const password = 'LoadTest2024!';
  const userName = `User_${__VU}_${__ITER}`;

  // Register
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: userName, email, password }),
    { headers: getHeaders(), timeout: '10s' }
  );

  const regOk = check(registerRes, { 'register': (r) => r.status === 201 });
  errorRate.add(!regOk);
  if (regOk) {
    registrations.add(1);
    responseTime.add(registerRes.timings.duration);
  }
  sleep(0.5);

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders(), timeout: '10s' }
  );

  let token: string | null = null;
  const loginOk = check(loginRes, { 'login': (r) => r.status === 201 });
  errorRate.add(!loginOk);
  if (loginOk) {
    logins.add(1);
    responseTime.add(loginRes.timings.duration);
    try {
      token = JSON.parse(loginRes.body as string).access_token;
    } catch { /* ignore */ }
  }
  sleep(0.3);

  // Session beitreten falls vorhanden
  const sessionId = getRandomSession();
  if (sessionId && token) {
    const joinRes = http.post(
      `${BASE_URL}/sessions/registerSessionUser`,
      JSON.stringify({ session_id: sessionId, user_name: userName }),
      { headers: getHeaders(token), timeout: '10s' }
    );
    check(joinRes, { 'join': (r) => r.status === 201 });
    sleep(0.2);

    // Paar schnelle Aktionen
    for (let i = 0; i < 3; i++) {
      http.post(
        `${BASE_URL}/sessions/heartbeat`,
        JSON.stringify({ sessionId }),
        { headers: getHeaders(token), timeout: '5s' }
      );
      heartbeats.add(1);
      sleep(0.2);

      http.get(`${BASE_URL}/pictures/session?session_id=${sessionId}`, {
        headers: getHeaders(token),
        timeout: '10s',
      });
      sleep(0.3);
    }
  }
}

// --- Session erstellen (CPU-lastig) ---

export function createSessionFlow() {
  const email = generateEmail();
  const password = 'LoadTest2024!';
  const userName = `Creator_${__VU}_${__ITER}`;

  // Register (bcrypt = CPU)
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: userName, email, password }),
    { headers: getHeaders(), timeout: '15s' }
  );

  if (!check(registerRes, { 'creator reg': (r) => r.status === 201 })) {
    errorRate.add(true);
    return;
  }
  registrations.add(1);
  sleep(0.3);

  // Login (bcrypt.compare = CPU)
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders(), timeout: '15s' }
  );

  if (!check(loginRes, { 'creator login': (r) => r.status === 201 })) {
    errorRate.add(true);
    return;
  }
  logins.add(1);

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch { return; }
  sleep(0.2);

  // Session erstellen
  const sessionRes = http.post(
    `${BASE_URL}/sessions/create`,
    JSON.stringify({
      settings: { name: `Event_${Date.now()}`, description: 'Load Test' },
      missions: [
        { title: 'Test 1', description: 'desc' },
        { title: 'Test 2', description: 'desc' },
      ],
    }),
    { headers: getHeaders(token), timeout: '10s' }
  );

  if (check(sessionRes, { 'session': (r) => r.status === 201 })) {
    sessionsCreated.add(1);
    try {
      const data = JSON.parse(sessionRes.body as string);
      if (data.id) {
        sessions.push(data.id);
        if (sessions.length > 100) sessions.shift(); // nicht zu viele speichern
      }
    } catch { /* ignore */ }
  } else {
    errorRate.add(true);
  }
}

// --- Foto Upload (I/O lastig) ---

export function photoUploadFlow() {
  const sessionId = getRandomSession();
  if (!sessionId) {
    sleep(1);
    return;
  }

  const userName = `Uploader_${__VU}_${__ITER}`;

  // Init
  const initRes = http.post(
    `${BASE_URL}/pictures/init-upload`,
    JSON.stringify({
      session_id: sessionId,
      original_filename: `peak_${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      u_name: userName,
    }),
    { headers: getHeaders(), timeout: '10s' }
  );

  if (!check(initRes, { 'init': (r) => r.status === 201 })) {
    errorRate.add(true);
    return;
  }

  let uploadUrl: string, pictureId: string;
  try {
    const data = JSON.parse(initRes.body as string);
    uploadUrl = data.uploadUrl;
    pictureId = data.pictureId;
  } catch {
    errorRate.add(true);
    return;
  }

  // S3
  const s3Res = http.put(uploadUrl, generateSmallPhoto(), {
    headers: { 'Content-Type': 'image/jpeg' },
    timeout: '15s',
  });

  if (!check(s3Res, { 's3': (r) => r.status === 200 })) {
    errorRate.add(true);
    return;
  }

  // Finalize
  const finalRes = http.post(
    `${BASE_URL}/pictures/finalize-upload`,
    JSON.stringify({ pictureId }),
    { headers: getHeaders(), timeout: '10s' }
  );

  if (check(finalRes, { 'finalize': (r) => r.status === 201 })) {
    photosUploaded.add(1);
    responseTime.add(initRes.timings.duration + finalRes.timings.duration);
  } else {
    errorRate.add(true);
  }
}

export default function () {
  // nicht verwendet
}

// --- Setup: ein paar Sessions vorab erstellen ---

export function setup() {
  console.log('=== PEAK TRAFFIC TEST ===');
  console.log('Ziel: 2 -> 25 Pods');

  const email = `setup_${Date.now()}@load.test`;
  const password = 'LoadTest2024!';

  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: 'Setup', email, password }),
    { headers: getHeaders() }
  );
  if (regRes.status !== 201) return { sessions: [] };

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );
  if (loginRes.status !== 201) return { sessions: [] };

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch { return { sessions: [] }; }

  // 5 Sessions erstellen
  const initialSessions: string[] = [];
  for (let i = 0; i < 5; i++) {
    const res = http.post(
      `${BASE_URL}/sessions/create`,
      JSON.stringify({
        settings: { name: `Init_${i}`, description: 'Setup' },
        missions: [{ title: 'Test', description: 'test' }],
      }),
      { headers: getHeaders(token) }
    );

    if (res.status === 201) {
      try {
        const data = JSON.parse(res.body as string);
        if (data.id) {
          initialSessions.push(data.id);
          sessions.push(data.id);
        }
      } catch { /* ignore */ }
    }
  }

  console.log(`${initialSessions.length} Sessions erstellt`);
  return { sessions: initialSessions };
}

export function teardown() {
  console.log('=== TEST BEENDET ===');
}

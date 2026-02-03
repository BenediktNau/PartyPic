/**
 * peak-traffic.ts - Extreme Last für HPA + Cluster Autoscaler
 * 
 * Simuliert einen viralen Moment / Großevent:
 * - Hunderte Gäste gleichzeitig
 * - Massive Foto-Uploads
 * - Ziel: HPA triggern UND Cluster Autoscaler (neue Nodes)
 * 
 * WICHTIG: Dies ist KEIN DDoS! Alle Requests sind valide User-Flows.
 * 
 * Erwartetes Verhalten:
 * - HPA skaliert Server Pods von 2 auf 25
 * - Bei Überlast: Cluster Autoscaler fügt neue Nodes hinzu
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ============================================================================
// KONFIGURATION
// ============================================================================
const BASE_URL = 'http://api.52.7.172.243.nip.io';

// Custom Metrics
const registrations = new Counter('registrations_success');
const logins = new Counter('logins_success');
const sessionsCreated = new Counter('sessions_created');
const photosUploaded = new Counter('photos_uploaded');
const heartbeats = new Counter('heartbeats_sent');
const responseTime = new Trend('response_time_ms');
const errorRate = new Rate('error_rate');

// ============================================================================
// TEST KONFIGURATION - Extreme Last
// ============================================================================
export const options = {
  scenarios: {
    // Phase 1: Schneller Aufbau der Last
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Schneller Start
        { duration: '1m', target: 150 },   // Starker Anstieg
        { duration: '2m', target: 300 },   // Peak Last - Trigger Autoscaler
        { duration: '3m', target: 400 },   // Maximale Last halten
        { duration: '2m', target: 200 },   // Langsamer Rückgang
        { duration: '1m', target: 50 },    // Normalisierung
        { duration: '30s', target: 0 },    // Ende
      ],
      exec: 'userFlow',
    },
    // Phase 2: Zusätzliche Session-Ersteller (CPU-intensive Operationen)
    session_creators: {
      executor: 'constant-arrival-rate',
      rate: 10,              // 10 neue Sessions pro Sekunde
      timeUnit: '1s',
      duration: '8m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'createSessionFlow',
      startTime: '30s',
    },
    // Phase 3: Massive Foto-Uploads (I/O intensive)
    photo_uploaders: {
      executor: 'constant-arrival-rate',
      rate: 20,              // 20 Foto-Uploads pro Sekunde
      timeUnit: '1s',
      duration: '7m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      exec: 'photoUploadFlow',
      startTime: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],      // <10% Fehlerrate (höher wegen Last)
    http_req_duration: ['p(95)<5000'],   // 95% unter 5s (höher wegen Last)
    error_rate: ['rate<0.15'],           // <15% Fehlerrate
  },
};

// Shared Sessions Pool
const sessions: string[] = [];
let sessionIndex = 0;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function generateEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const vu = __VU || 0;
  return `peak_${vu}_${timestamp}_${random}@load.test`;
}

function generatePassword(): string {
  return 'LoadTest2024!';
}

function getHeaders(token?: string): { [key: string]: string } {
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function generateSmallPhoto(): string {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

function getRandomSession(): string | null {
  if (sessions.length === 0) return null;
  return sessions[Math.floor(Math.random() * sessions.length)];
}

// ============================================================================
// USER FLOW - Kompletter User Journey (schnell)
// ============================================================================
export function userFlow() {
  const email = generateEmail();
  const password = generatePassword();
  const userName = `User_${__VU}_${__ITER}`;

  // 1. Registrierung (schnell, kein langes Warten)
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: userName, email, password }),
    { headers: getHeaders(), timeout: '10s' }
  );

  const regSuccess = check(registerRes, { 'Registrierung OK': (r) => r.status === 201 });
  errorRate.add(!regSuccess);
  if (regSuccess) {
    registrations.add(1);
    responseTime.add(registerRes.timings.duration);
  }
  sleep(0.5); // Minimale Pause

  // 2. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders(), timeout: '10s' }
  );

  let token: string | null = null;
  const loginSuccess = check(loginRes, { 'Login OK': (r) => r.status === 201 });
  errorRate.add(!loginSuccess);
  if (loginSuccess) {
    logins.add(1);
    responseTime.add(loginRes.timings.duration);
    try {
      token = JSON.parse(loginRes.body as string).access_token;
    } catch {
      // Ignorieren
    }
  }
  sleep(0.3);

  // 3. Session beitreten
  const sessionId = getRandomSession();
  if (sessionId && token) {
    const joinRes = http.post(
      `${BASE_URL}/sessions/registerSessionUser`,
      JSON.stringify({ session_id: sessionId, user_name: userName }),
      { headers: getHeaders(token), timeout: '10s' }
    );

    check(joinRes, { 'Session beigetreten': (r) => r.status === 201 });
    sleep(0.2);

    // 4. Aktionen in schneller Folge
    for (let i = 0; i < 3; i++) {
      // Heartbeat
      http.post(
        `${BASE_URL}/sessions/heartbeat`,
        JSON.stringify({ sessionId }),
        { headers: getHeaders(token), timeout: '5s' }
      );
      heartbeats.add(1);
      sleep(0.2);

      // Gallery abrufen
      http.get(`${BASE_URL}/pictures/session?session_id=${sessionId}`, {
        headers: getHeaders(token),
        timeout: '10s',
      });
      sleep(0.3);
    }
  }
}

// ============================================================================
// CREATE SESSION FLOW - CPU-intensive (Passwort-Hashing)
// ============================================================================
export function createSessionFlow() {
  const email = generateEmail();
  const password = generatePassword();
  const userName = `Creator_${__VU}_${__ITER}`;

  // 1. Registrierung (CPU-intensiv wegen bcrypt)
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: userName, email, password }),
    { headers: getHeaders(), timeout: '15s' }
  );

  if (!check(registerRes, { 'Creator registriert': (r) => r.status === 201 })) {
    errorRate.add(true);
    return;
  }
  registrations.add(1);
  sleep(0.3);

  // 2. Login (CPU-intensiv wegen bcrypt.compare)
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders(), timeout: '15s' }
  );

  if (!check(loginRes, { 'Creator eingeloggt': (r) => r.status === 201 })) {
    errorRate.add(true);
    return;
  }
  logins.add(1);

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch {
    return;
  }
  sleep(0.2);

  // 3. Session erstellen
  const sessionRes = http.post(
    `${BASE_URL}/sessions/create`,
    JSON.stringify({
      settings: { name: `Event_${Date.now()}`, description: 'Load Test Event' },
      missions: [
        { title: 'Mission 1', description: 'Beschreibung' },
        { title: 'Mission 2', description: 'Beschreibung' },
      ],
    }),
    { headers: getHeaders(token), timeout: '10s' }
  );

  if (check(sessionRes, { 'Session erstellt': (r) => r.status === 201 })) {
    sessionsCreated.add(1);
    try {
      const data = JSON.parse(sessionRes.body as string);
      if (data.id) {
        sessions.push(data.id);
        // Limit Sessions Array Size
        if (sessions.length > 100) {
          sessions.shift();
        }
      }
    } catch {
      // Ignorieren
    }
  } else {
    errorRate.add(true);
  }
}

// ============================================================================
// PHOTO UPLOAD FLOW - I/O intensive
// ============================================================================
export function photoUploadFlow() {
  const sessionId = getRandomSession();
  if (!sessionId) {
    // Keine Session verfügbar, kurze Pause und retry
    sleep(1);
    return;
  }

  const userName = `Uploader_${__VU}_${__ITER}`;

  // 1. Init Upload
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

  if (!check(initRes, { 'Upload init OK': (r) => r.status === 201 })) {
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

  // 2. S3 Upload
  const photoData = generateSmallPhoto();
  const s3Res = http.put(uploadUrl, photoData, {
    headers: { 'Content-Type': 'image/jpeg' },
    timeout: '15s',
  });

  if (!check(s3Res, { 'S3 Upload OK': (r) => r.status === 200 })) {
    errorRate.add(true);
    return;
  }

  // 3. Finalize
  const finalRes = http.post(
    `${BASE_URL}/pictures/finalize-upload`,
    JSON.stringify({ pictureId }),
    { headers: getHeaders(), timeout: '10s' }
  );

  if (check(finalRes, { 'Finalize OK': (r) => r.status === 201 })) {
    photosUploaded.add(1);
    responseTime.add(initRes.timings.duration + finalRes.timings.duration);
  } else {
    errorRate.add(true);
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export default function () {
  // Wird nicht verwendet, da wir Scenarios nutzen
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================
export function setup() {
  console.log('========================================');
  console.log('PEAK TRAFFIC TEST GESTARTET');
  console.log('========================================');
  console.log('Ziel: HPA und Cluster Autoscaler triggern');
  console.log('Max VUs: 400');
  console.log('Erwartete Pods: 2 → 25');
  console.log('========================================');

  // Erstelle initial einige Sessions für den Pool
  const email = `setup_${Date.now()}@load.test`;
  const password = 'LoadTest2024!';

  // Registrierung
  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: 'Setup User', email, password }),
    { headers: getHeaders() }
  );

  if (regRes.status !== 201) {
    console.warn('Setup: Registrierung fehlgeschlagen');
    return { sessions: [] };
  }

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );

  if (loginRes.status !== 201) {
    console.warn('Setup: Login fehlgeschlagen');
    return { sessions: [] };
  }

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch {
    return { sessions: [] };
  }

  // Erstelle 5 initiale Sessions
  const initialSessions: string[] = [];
  for (let i = 0; i < 5; i++) {
    const sessionRes = http.post(
      `${BASE_URL}/sessions/create`,
      JSON.stringify({
        settings: { name: `InitialSession_${i}`, description: 'Initial Load Test Session' },
        missions: [{ title: 'Test', description: 'Test' }],
      }),
      { headers: getHeaders(token) }
    );

    if (sessionRes.status === 201) {
      try {
        const data = JSON.parse(sessionRes.body as string);
        if (data.id) {
          initialSessions.push(data.id);
          sessions.push(data.id);
        }
      } catch {
        // Ignorieren
      }
    }
  }

  console.log(`Setup: ${initialSessions.length} Sessions erstellt`);
  return { sessions: initialSessions };
}

export function teardown(data: { sessions: string[] }) {
  console.log('========================================');
  console.log('PEAK TRAFFIC TEST BEENDET');
  console.log('========================================');
  console.log(`Sessions erstellt: ${sessionsCreated}`);
  console.log(`Fotos hochgeladen: ${photosUploaded}`);
  console.log('========================================');
}

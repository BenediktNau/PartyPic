/*
 * normal-traffic.ts
 * 
 * Simuliert normalen Event-Verkehr (Hochzeit, Geburtstag, etc.)
 * Laeuft ca. 10 Minuten und testet ob die App stabil bleibt.
 *
 * Nutzung:
 *   # IP automatisch von AWS holen und Test starten:
 *   LB_IP=$(aws ec2 describe-addresses --query "Addresses[?Tags[?Key=='Name' && contains(Value,'partypic')]].PublicIp" --output text) && \
 *   k6 run -e BASE_URL=http://api.$LB_IP.nip.io dist/normal-traffic.js
 *
 *   # Oder manuell:
 *   k6 run -e BASE_URL=http://api.1.2.3.4.nip.io dist/normal-traffic.js
 *
 *   # Lokal testen:
 *   k6 run dist/normal-traffic.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// URL aus Environment Variable oder Fallback auf localhost
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Metriken
const registrations = new Counter('registrations_success');
const logins = new Counter('logins_success');
const sessionsCreated = new Counter('sessions_created');
const photosUploaded = new Counter('photos_uploaded');
const heartbeats = new Counter('heartbeats_sent');
const responseTime = new Trend('response_time_ms');

export const options = {
  scenarios: {
    // Organisator erstellt die Session
    organizer: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      exec: 'organizerFlow',
      startTime: '0s',
    },
    // Gaeste kommen nach und nach
    guests_arriving: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },   // erste Gaeste
        { duration: '2m', target: 15 },  // mehr kommen
        { duration: '3m', target: 20 },  // volle Party
        { duration: '2m', target: 10 },  // Leute gehen
        { duration: '2m', target: 0 },   // Ende
      ],
      exec: 'guestFlow',
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

// Session ID die vom Organisator erstellt wird
let sharedSessionId: string | null = null;

// --- Helper ---

function generateEmail(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@event.de`;
}

function getHeaders(token?: string): { [key: string]: string } {
  const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// 1x1 PNG - reicht zum Testen
function generateSmallPhoto(): string {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// --- Organisator Flow ---

export function organizerFlow() {
  const email = `organizer_${Date.now()}@event.de`;
  const password = 'EventPass2024!';
  const eventName = `Hochzeit_${new Date().toISOString().split('T')[0]}`;

  console.log(`Erstelle Event: ${eventName}`);

  // Registrieren
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: 'Event Organisator', email, password }),
    { headers: getHeaders() }
  );

  if (!check(registerRes, { 'register ok': (r) => r.status === 201 })) {
    console.error('Registrierung fehlgeschlagen');
    return;
  }
  registrations.add(1);
  sleep(1);

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );

  if (!check(loginRes, { 'login ok': (r) => r.status === 201 })) {
    console.error('Login fehlgeschlagen');
    return;
  }
  logins.add(1);

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch {
    console.error('Token parsing error');
    return;
  }
  sleep(1);

  // Session erstellen
  const sessionRes = http.post(
    `${BASE_URL}/sessions/create`,
    JSON.stringify({
      settings: { name: eventName, description: 'Willkommen!' },
      missions: [
        { title: 'Brautpaar', description: 'Foto mit dem Brautpaar' },
        { title: 'Torte', description: 'Die Hochzeitstorte' },
        { title: 'Tanzen', description: 'Auf der Tanzfläche' },
      ],
    }),
    { headers: getHeaders(token) }
  );

  if (!check(sessionRes, { 'session created': (r) => r.status === 201 })) {
    console.error('Session erstellen fehlgeschlagen');
    return;
  }
  sessionsCreated.add(1);

  try {
    sharedSessionId = JSON.parse(sessionRes.body as string).id;
    console.log(`Session erstellt: ${sharedSessionId}`);
  } catch {
    console.error('Session ID parsing error');
  }

  // Organisator bleibt online
  for (let i = 0; i < 30; i++) {
    sleep(20);
    if (sharedSessionId) {
      http.post(
        `${BASE_URL}/sessions/heartbeat`,
        JSON.stringify({ sessionId: sharedSessionId }),
        { headers: getHeaders(token) }
      );
      heartbeats.add(1);
    }
  }
}

// --- Gast Flow ---

export function guestFlow() {
  // Warten bis Session da ist
  let attempts = 0;
  while (!sharedSessionId && attempts < 30) {
    sleep(1);
    attempts++;
  }

  if (!sharedSessionId) {
    console.warn('Keine Session gefunden');
    return;
  }

  const guestName = `Gast_${__VU}_${Date.now().toString(36)}`;
  const email = generateEmail();
  const password = 'EventPass2024!';

  // 50% sind neue User
  if (Math.random() < 0.5) {
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ name: guestName, email, password }),
      { headers: getHeaders() }
    );

    if (check(registerRes, { 'guest registered': (r) => r.status === 201 })) {
      registrations.add(1);
      responseTime.add(registerRes.timings.duration);
    }
    sleep(randomBetween(1, 3));
  }

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );

  let token: string | null = null;
  if (check(loginRes, { 'guest login': (r) => r.status === 201 })) {
    logins.add(1);
    responseTime.add(loginRes.timings.duration);
    try {
      token = JSON.parse(loginRes.body as string).access_token;
    } catch { /* ignore */ }
  }
  sleep(randomBetween(2, 5));

  // Session beitreten
  const joinRes = http.post(
    `${BASE_URL}/sessions/registerSessionUser`,
    JSON.stringify({ session_id: sharedSessionId, user_name: guestName }),
    { headers: getHeaders(token || undefined) }
  );

  let sessionUserId: string | null = null;
  if (check(joinRes, { 'joined session': (r) => r.status === 201 })) {
    try {
      sessionUserId = JSON.parse(joinRes.body as string).id;
    } catch { /* ignore */ }
  }

  // Gast macht Sachen: Fotos, Gallery, Heartbeats
  const activityDuration = randomBetween(60, 180);
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < activityDuration) {
    const action = Math.random();

    if (action < 0.3) {
      uploadPhoto(token, sharedSessionId, guestName);
    } else if (action < 0.6) {
      viewGallery(token, sharedSessionId);
    } else if (sessionUserId) {
      http.post(
        `${BASE_URL}/sessions/heartbeat`,
        JSON.stringify({ sessionId: sharedSessionId }),
        { headers: getHeaders(token || undefined) }
      );
      heartbeats.add(1);
    }

    sleep(randomBetween(5, 30));
  }
}

// --- Foto Upload ---

function uploadPhoto(token: string | null, sessionId: string, userName: string) {
  const initRes = http.post(
    `${BASE_URL}/pictures/init-upload`,
    JSON.stringify({
      session_id: sessionId,
      original_filename: `foto_${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      u_name: userName,
    }),
    { headers: getHeaders(token || undefined) }
  );

  if (!check(initRes, { 'init upload': (r) => r.status === 201 })) return;

  let uploadUrl: string, pictureId: string;
  try {
    const data = JSON.parse(initRes.body as string);
    uploadUrl = data.uploadUrl;
    pictureId = data.pictureId;
  } catch { return; }

  // S3 upload
  const s3Res = http.put(uploadUrl, generateSmallPhoto(), {
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (!check(s3Res, { 's3 upload': (r) => r.status === 200 })) return;

  // Finalize
  const finalRes = http.post(
    `${BASE_URL}/pictures/finalize-upload`,
    JSON.stringify({ pictureId }),
    { headers: getHeaders(token || undefined) }
  );

  if (check(finalRes, { 'finalize': (r) => r.status === 201 })) {
    photosUploaded.add(1);
    responseTime.add(initRes.timings.duration + finalRes.timings.duration);
  }
}

function viewGallery(token: string | null, sessionId: string) {
  const res = http.get(`${BASE_URL}/pictures/session?session_id=${sessionId}`, {
    headers: getHeaders(token || undefined),
  });
  check(res, { 'gallery loaded': (r) => r.status === 200 });
  responseTime.add(res.timings.duration);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export default function () {
  // nicht verwendet, wir nutzen scenarios
}

/**
 * normal-traffic.ts - Realistischer normaler Verkehr
 * 
 * Simuliert einen typischen Tag bei einer Hochzeit/Event:
 * - Gäste kommen an, registrieren sich, machen Fotos
 * - Normaler Verkehr, der die App im Alltag erlebt
 * - Dauer: ~10 Minuten, simuliert komprimiert einen Event-Tag
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

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

// ============================================================================
// TEST KONFIGURATION - Normaler Event-Verkehr
// ============================================================================
export const options = {
  scenarios: {
    // Szenario 1: Event-Organisator erstellt Session (1 User)
    organizer: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      exec: 'organizerFlow',
      startTime: '0s',
    },
    // Szenario 2: Gäste kommen langsam an (ramp up)
    guests_arriving: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 },   // Erste Gäste
        { duration: '2m', target: 15 },  // Mehr Gäste kommen
        { duration: '3m', target: 20 },  // Event in vollem Gange
        { duration: '2m', target: 10 },  // Gäste gehen langsam
        { duration: '2m', target: 0 },   // Event endet
      ],
      exec: 'guestFlow',
      startTime: '10s', // Warten bis Organizer Session erstellt hat
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],      // <5% Fehlerrate
    http_req_duration: ['p(95)<2000'],   // 95% unter 2s
  },
};

// Shared Session ID (wird vom Organizer gesetzt)
let sharedSessionId: string | null = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function generateEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `guest_${timestamp}_${random}@event.de`;
}

function generatePassword(): string {
  return 'EventPass2024!';
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

// Simuliere ein kleines Foto (Base64 encoded)
function generateSmallPhoto(): string {
  // Kleines 1x1 PNG als Base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// ============================================================================
// ORGANIZER FLOW - Event-Organisator erstellt Session
// ============================================================================
export function organizerFlow() {
  const email = `organizer_${Date.now()}@event.de`;
  const password = generatePassword();
  const eventName = `Hochzeit_${new Date().toISOString().split('T')[0]}`;

  console.log(`[Organizer] Erstelle Event: ${eventName}`);

  // 1. Registrierung
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: 'Event Organisator', email, password }),
    { headers: getHeaders() }
  );

  if (!check(registerRes, { 'Organizer registriert': (r) => r.status === 201 })) {
    console.error('[Organizer] Registrierung fehlgeschlagen');
    return;
  }
  registrations.add(1);
  sleep(1);

  // 2. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );

  if (!check(loginRes, { 'Organizer eingeloggt': (r) => r.status === 201 })) {
    console.error('[Organizer] Login fehlgeschlagen');
    return;
  }
  logins.add(1);

  let token: string;
  try {
    token = JSON.parse(loginRes.body as string).access_token;
  } catch {
    console.error('[Organizer] Token parsing fehlgeschlagen');
    return;
  }
  sleep(1);

  // 3. Session erstellen
  const sessionRes = http.post(
    `${BASE_URL}/sessions/create`,
    JSON.stringify({
      settings: { name: eventName, description: 'Willkommen zu unserem Event!' },
      missions: [
        { title: 'Brautpaar', description: 'Foto mit dem Brautpaar' },
        { title: 'Torte', description: 'Die Hochzeitstorte' },
        { title: 'Tanzen', description: 'Auf der Tanzfläche' },
      ],
    }),
    { headers: getHeaders(token) }
  );

  if (!check(sessionRes, { 'Session erstellt': (r) => r.status === 201 })) {
    console.error('[Organizer] Session-Erstellung fehlgeschlagen');
    return;
  }
  sessionsCreated.add(1);

  try {
    const sessionData = JSON.parse(sessionRes.body as string);
    sharedSessionId = sessionData.id;
    console.log(`[Organizer] Session erstellt: ${sharedSessionId}`);
  } catch {
    console.error('[Organizer] Session ID parsing fehlgeschlagen');
  }

  // Organizer bleibt online und sendet Heartbeats
  for (let i = 0; i < 30; i++) {
    sleep(20); // Alle 20 Sekunden Heartbeat
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

// ============================================================================
// GUEST FLOW - Event-Gast nimmt teil
// ============================================================================
export function guestFlow() {
  // Warten bis Session existiert
  let attempts = 0;
  while (!sharedSessionId && attempts < 30) {
    sleep(1);
    attempts++;
  }

  if (!sharedSessionId) {
    console.warn('[Gast] Keine Session verfügbar, überspringe...');
    return;
  }

  const guestName = `Gast_${__VU}_${Date.now().toString(36)}`;
  const email = generateEmail();
  const password = generatePassword();

  // 1. Registrierung (50% der Gäste sind neu)
  if (Math.random() < 0.5) {
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ name: guestName, email, password }),
      { headers: getHeaders() }
    );

    if (check(registerRes, { 'Gast registriert': (r) => r.status === 201 })) {
      registrations.add(1);
      responseTime.add(registerRes.timings.duration);
    }
    sleep(randomBetween(1, 3));
  }

  // 2. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );

  let token: string | null = null;
  if (check(loginRes, { 'Gast eingeloggt': (r) => r.status === 201 })) {
    logins.add(1);
    responseTime.add(loginRes.timings.duration);
    try {
      token = JSON.parse(loginRes.body as string).access_token;
    } catch {
      // Ignorieren
    }
  }
  sleep(randomBetween(2, 5));

  // Falls Login fehlschlägt, als anonymer Gast weitermachen
  // 3. Session beitreten
  const joinRes = http.post(
    `${BASE_URL}/sessions/registerSessionUser`,
    JSON.stringify({ session_id: sharedSessionId, user_name: guestName }),
    { headers: getHeaders(token || undefined) }
  );

  let sessionUserId: string | null = null;
  if (check(joinRes, { 'Session beigetreten': (r) => r.status === 201 })) {
    try {
      sessionUserId = JSON.parse(joinRes.body as string).id;
    } catch {
      // Ignorieren
    }
  }

  // 4. Gast-Aktivität: Fotos machen, Gallery anschauen, Heartbeats
  const activityDuration = randomBetween(60, 180); // 1-3 Minuten aktiv
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < activityDuration) {
    const action = Math.random();

    if (action < 0.3) {
      // 30%: Foto hochladen
      uploadPhoto(token, sharedSessionId, guestName);
    } else if (action < 0.6) {
      // 30%: Gallery anschauen
      viewGallery(token, sharedSessionId);
    } else {
      // 40%: Heartbeat senden
      if (sessionUserId) {
        http.post(
          `${BASE_URL}/sessions/heartbeat`,
          JSON.stringify({ sessionId: sharedSessionId }),
          { headers: getHeaders(token || undefined) }
        );
        heartbeats.add(1);
      }
    }

    // Realistische Pause zwischen Aktionen (5-30 Sekunden)
    sleep(randomBetween(5, 30));
  }
}

// ============================================================================
// HELPER: Foto hochladen
// ============================================================================
function uploadPhoto(token: string | null, sessionId: string, userName: string) {
  // 1. Init Upload
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

  if (!check(initRes, { 'Upload initiiert': (r) => r.status === 201 })) {
    return;
  }

  let uploadUrl: string, pictureId: string;
  try {
    const data = JSON.parse(initRes.body as string);
    uploadUrl = data.uploadUrl;
    pictureId = data.pictureId;
  } catch {
    return;
  }

  // 2. Upload zu S3 (simuliert)
  const photoData = generateSmallPhoto();
  const s3Res = http.put(uploadUrl, photoData, {
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (!check(s3Res, { 'S3 Upload OK': (r) => r.status === 200 })) {
    return;
  }

  // 3. Finalize
  const finalRes = http.post(
    `${BASE_URL}/pictures/finalize-upload`,
    JSON.stringify({ pictureId }),
    { headers: getHeaders(token || undefined) }
  );

  if (check(finalRes, { 'Upload finalisiert': (r) => r.status === 201 })) {
    photosUploaded.add(1);
    responseTime.add(initRes.timings.duration + finalRes.timings.duration);
  }
}

// ============================================================================
// HELPER: Gallery anschauen
// ============================================================================
function viewGallery(token: string | null, sessionId: string) {
  const res = http.get(`${BASE_URL}/pictures/session?session_id=${sessionId}`, {
    headers: getHeaders(token || undefined),
  });

  check(res, { 'Gallery geladen': (r) => r.status === 200 });
  responseTime.add(res.timings.duration);
}

// ============================================================================
// HELPER: Zufallszahl zwischen min und max
// ============================================================================
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
export default function () {
  // Wird nicht verwendet, da wir Scenarios nutzen
}

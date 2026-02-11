/**
 * k6 Lasttest: Peak Traffic Simulation
 * 
 * Simuliert realistisches Benutzerverhalten mit:
 * - 20 Sessions
 * - 20-30 User pro Session (insgesamt ~500 User)
 * - Menschliche Reaktionszeiten und Tippgeschwindigkeiten
 * - Registrierung -> Login -> Session erstellen -> Bilder hochladen -> Galerie anschauen
 * 
 * USAGE:
 * ------
 * 1. Hole die Ingress-URL aus AWS:
 *    export APP_URL=$(kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}')
 *    echo "http://$APP_URL"
 * 
 * 2. Fuehre das Skript aus:
 *    cd k6/
 *    APP_URL=http://app.<ip>.nip.io npm run peak
 *    
 *    ODER mit kubectl-URL:
 *    APP_URL=$(kubectl get ingress party-pic-ingress -n default -o jsonpath='{.spec.rules[0].host}' | xargs -I {} echo "http://{}") npm run peak
 */

import { sleep } from 'k6';
import { Options } from 'k6/options';
import http from 'k6/http';
import {
  generateUser,
  registerUser,
  loginUser,
  createSession,
  getSession,
  initUpload,
  uploadImage,
  finalizeUpload,
  getGallery,
  generateDummyImage,
  humanThinkTime,
  typingDelay,
  registerSessionUser,
  sendHeartbeat,
  User,
  Session,
} from './helpers';

// k6 Test-Konfiguration
export const options: Options = {
  stages: [
    { duration: '2m', target: 50 },   // Langsamer Start
    { duration: '3m', target: 150 },  // Ramp-Up
    { duration: '3m', target: 300 },  // Peak
    { duration: '2m', target: 0 },    // Ramp-Down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% der Requests unter 3s
    http_req_failed: ['rate<0.10'],    // Fehlerrate unter 10%
  },
};

// Globale Variablen fuer Session-Verwaltung
const SESSIONS: Session[] = [];
const SESSION_COUNT = 20;

export function setup() {
  const baseUrl = __ENV.APP_URL || 'http://localhost:3000';
  
  console.log('Starting Peak Traffic Simulation');
  console.log('Target URL: ' + baseUrl);
  console.log('Creating ' + SESSION_COUNT + ' sessions...');
  console.log('');
  
  // Test connectivity first
  console.log('Testing connectivity to: ' + baseUrl);
  const testResponse = http.get(baseUrl);
  console.log('Base URL test - Status: ' + testResponse.status);
  console.log('');

  // Erstelle 20 Sessions
  for (let i = 0; i < SESSION_COUNT; i++) {
    const admin = generateUser(`admin_session${i}`);
    
    if (registerUser(baseUrl, admin)) {
      sleep(0.5);
      const token = loginUser(baseUrl, admin);
      
      if (token) {
        sleep(0.5);
        const session = createSession(
          baseUrl,
          token
        );
        
        if (session) {
          SESSIONS.push(session);
          console.log('Session ' + (i + 1) + ' created: ' + session.id);
        } else {
          console.log('Session creation failed for admin ' + (i + 1));
        }
      } else {
        console.log('Login failed for admin ' + (i + 1));
      }
    } else {
      console.log('Registration failed for admin ' + (i + 1));
    }
    
    sleep(0.5);
  }

  console.log('Setup complete: ' + SESSIONS.length + ' sessions ready');
  
  if (SESSIONS.length === 0) {
    console.error('FATAL: No sessions were created! Check backend connectivity.');
  }
  
  return {
    baseUrl,
    sessions: SESSIONS,
  };
}

export default function (data: any) {
  const baseUrl = data.baseUrl;
  const sessions = data.sessions;

  if (!sessions || sessions.length === 0) {
    console.error('No sessions available! Aborting.');
    return;
  }

  // Waehle zufaellige Session
  const session = sessions[Math.floor(Math.random() * sessions.length)];
  
  // Simuliere Benutzerflow
  userJourneyPeak(baseUrl, session);
}

/**
 * Simuliert Peak-Benutzer-Journey mit realistischen Delays
 */
function userJourneyPeak(baseUrl: string, session: Session) {
  const user = generateUser('peak');

  // 1. REGISTRIERUNG (simuliere Formular-Ausfüllen)
  sleep(humanThinkTime()); // Nutzer denkt nach
  sleep(typingDelay(user.email.length)); // Tippt Email
  sleep(0.5); // Kurze Pause
  sleep(typingDelay(user.username.length)); // Tippt Username
  sleep(0.5);
  sleep(typingDelay(12)); // Tippt Passwort (~12 Zeichen)
  
  const registered = registerUser(baseUrl, user);
  if (!registered) {
    console.log('Registration failed for ' + user.email);
    return;
  }
  
  sleep(humanThinkTime()); // Reaktionszeit nach Registrierung

  // 2. LOGIN
  sleep(typingDelay(user.email.length)); // Email eingeben
  sleep(0.3);
  sleep(typingDelay(12)); // Passwort eingeben
  
  const token = loginUser(baseUrl, user);
  if (!token) {
    console.log('Login failed');
    return;
  }
  
  sleep(humanThinkTime()); // Nach Login kurz warten

  // 3. ALS SESSION-USER REGISTRIEREN (fuer Online-Status)
  const sessionUserId = registerSessionUser(baseUrl, user.username, session.id);
  if (sessionUserId) {
    user.sessionUserId = sessionUserId;
    sendHeartbeat(baseUrl, sessionUserId); // Initial Heartbeat
  }
  sleep(0.5);

  // 4. SESSION ABRUFEN
  getSession(baseUrl, session.id);
  sleep(1 + Math.random() * 2); // Schaut sich Session an
  
  // Heartbeat waehrend Aktivitaet
  if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);

  // 5. GALERIE LADEN (vor Upload)
  getGallery(baseUrl, session.id);
  sleep(1 + Math.random()); // Schaut sich Galerie an
  
  // Heartbeat waehrend Aktivitaet
  if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);

  // 6. BILDER HOCHLADEN (2-4 Bilder)
  const imageCount = 2 + Math.floor(Math.random() * 3); // 2-4 Bilder
  
  for (let i = 0; i < imageCount; i++) {
    sleep(2 + Math.random() * 3); // "Bild machen" dauert 2-5s
    
    // Heartbeat waehrend Upload
    if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);
    
    const filename = `photo_${Date.now()}_${i}.jpg`;
    const imageSize = 100; // 100KB
    const imageData = generateDummyImage(imageSize);
    
    const uploadData = initUpload(
      baseUrl,
      session.id,
      'image/jpeg'
    );
    
    if (uploadData && uploadData.uploadUrl && uploadData.key) {
      sleep(0.3);
      
      if (uploadImage(uploadData.uploadUrl, imageData)) {
        sleep(0.3);
        
        finalizeUpload(
          baseUrl,
          user.username,
          session.id,
          uploadData.key,
          filename,
          imageSize * 1024,
          'image/jpeg'
        );
        console.log('User uploaded image ' + (i + 1) + '/' + imageCount);
      }
      
      sleep(1 + Math.random());
    } else {
      console.log('Init upload failed, skipping image');
    }
  }

  // 7. GALERIE NOCHMAL LADEN (nach Uploads)
  sleep(humanThinkTime());
  if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);
  
  getGallery(baseUrl, session.id);
  
  // 8. DURCH GALERIE SCROLLEN
  sleep(3 + Math.random() * 5); // 3-8 Sekunden Galerie anschauen
  if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);
  
  // 9. NOCHMAL GALERIE REFRESHEN
  if (Math.random() > 0.5) { // 50% Chance
    sleep(humanThinkTime());
    getGallery(baseUrl, session.id);
    sleep(2 + Math.random() * 3);
    if (sessionUserId) sendHeartbeat(baseUrl, sessionUserId);
  }
}

export function teardown(data: any) {
  console.log('Normal Traffic Test complete');
  console.log('Tested ' + data.sessions.length + ' sessions');
}


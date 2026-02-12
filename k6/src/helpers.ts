/**
 * Gemeinsame Helper-Funktionen für k6 Lasttest-Skripte
 */

import { check } from 'k6';
import http from 'k6/http';

export interface User {
  email: string;
  password: string;
  username: string;
  token?: string;
  sessionUserId?: string;
}

export interface Session {
  id: string;
  name: string;
}

/**
 * Generiert einen zufälligen Benutzer
 */
export function generateUser(prefix: string = 'user'): User {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    email: `${prefix}_${timestamp}_${random}@loadtest.local`,
    password: `Test123!${random}`,
    username: `${prefix}_user_${random}`,
  };
}

/**
 * Registriert einen neuen Benutzer
 */
export function registerUser(baseUrl: string, user: User): boolean {
  const response = http.post(
    `${baseUrl}/auth/register`,
    JSON.stringify({
      email: user.email,
      password: user.password,
      username: user.username,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(response, {
    'registration successful': (r) => r.status === 201 || r.status === 200,
  });
  
  if (!success) {
    console.log('Registration failed for ' + user.email + ' - Status: ' + response.status + ' - Body: ' + response.body);
  }
  
  return success;
}

/**
 * Meldet einen Benutzer an und gibt das Token zurück
 */
export function loginUser(baseUrl: string, user: User): string | null {
  const response = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(response, {
    'login successful': (r) => r.status === 200 || r.status === 201,
  });

  if (success && response.json()) {
    const data = response.json() as any;
    return data.access_token || data.token || null;
  }
  
  if (!success) {
    console.log('Login failed for ' + user.email + ' - Status: ' + response.status);
  }

  return null;
}

/**
 * Erstellt eine neue Session
 */
export function createSession(
  baseUrl: string,
  token: string
): Session | null {
  const response = http.post(
    `${baseUrl}/sessions/create`,
    '',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const success = check(response, {
    'session created': (r) => r.status === 201 || r.status === 200,
  });

  if (success && response.json()) {
    const data = response.json() as any;
    return {
      id: data.sessionId,
      name: 'LoadTest Session',
    };
  }
  
  if (!success) {
    console.log('Session creation failed - Status: ' + response.status + ' - Body: ' + response.body);
  }

  return null;
}

/**
 * Holt alle Sessions
 */
export function getSession(baseUrl: string, sessionId: string): boolean {
  const response = http.get(`${baseUrl}/sessions/get?sessionId=${sessionId}`);

  return check(response, {
    'session retrieved': (r) => r.status === 200,
  });
}

/**
 * Initiiert einen Bild-Upload
 */
export function initUpload(
  baseUrl: string,
  sessionId: string,
  mimetype: string
): any {
  const response = http.post(
    `${baseUrl}/pictures/init-upload`,
    JSON.stringify({
      session_id: sessionId,
      mimetype: mimetype,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const success = check(response, {
    'upload initialized': (r) => r.status === 200 || r.status === 201,
  });

  if (success && response.json()) {
    return response.json();
  }

  return null;
}

/**
 * Lädt ein Bild zur vorzeichneten URL hoch
 */
export function uploadImage(
  uploadUrl: string,
  imageData: string | ArrayBuffer
): boolean {
  const response = http.put(uploadUrl, imageData, {
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });

  return check(response, {
    'image uploaded': (r) => r.status === 200,
  });
}

/**
 * Bestätigt den Upload
 */
export function finalizeUpload(
  baseUrl: string,
  userName: string,
  sessionId: string,
  s3Key: string,
  originalFilename: string,
  filesizeBytes: number,
  mimetype: string
): boolean {
  const response = http.post(
    `${baseUrl}/pictures/finalize-upload`,
    JSON.stringify({
      u_name: userName,
      session_id: sessionId,
      s3_key: s3Key,
      original_filename: originalFilename,
      filesize_bytes: filesizeBytes,
      mimetype: mimetype,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return check(response, {
    'upload finalized': (r) => r.status === 200 || r.status === 201,
  });
}

/**
 * Holt alle Bilder einer Session (Galerie)
 */
export function getGallery(
  baseUrl: string,
  sessionId: string
): boolean {
  const response = http.get(`${baseUrl}/pictures/session?sessionId=${sessionId}`);

  return check(response, {
    'gallery loaded': (r) => r.status === 200,
  });
}

/**
 * Registriert einen User in einer Session (fuer Heartbeat)
 */
export function registerSessionUser(
  baseUrl: string,
  username: string,
  sessionId: string
): string | null {
  const response = http.post(
    `${baseUrl}/sessions/registerSessionUser`,
    JSON.stringify({
      username: username,
      sessionId: sessionId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const success = check(response, {
    'session user registered': (r) => r.status === 200 || r.status === 201,
  });

  if (success && response.json()) {
    const data = response.json() as any;
    return data.id || data.userId || null;
  }

  return null;
}

/**
 * Sendet einen Heartbeat fuer einen Session-User
 */
export function sendHeartbeat(
  baseUrl: string,
  userId: string
): boolean {
  const response = http.post(
    `${baseUrl}/sessions/heartbeat`,
    JSON.stringify({
      userId: userId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return check(response, {
    'heartbeat sent': (r) => r.status === 200 || r.status === 201,
  });
}

/**
 * Generiert ein Dummy-Bild (JPEG)
 */
export function generateDummyImage(sizeKB: number = 50): ArrayBuffer {
  // Erstelle ein einfaches JPEG-Header + Daten
  const size = sizeKB * 1024;
  const buffer = new Uint8Array(size);
  
  // JPEG Magic Number
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  buffer[3] = 0xe0;
  
  // Fülle Rest mit Zufallsdaten
  for (let i = 4; i < size - 2; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  
  // JPEG End Marker
  buffer[size - 2] = 0xff;
  buffer[size - 1] = 0xd9;
  
  return buffer.buffer;
}

/**
 * Simuliert menschliche Reaktionszeit (1-3 Sekunden)
 */
export function humanThinkTime(): number {
  return 1 + Math.random() * 2; // 1-3 Sekunden
}

/**
 * Simuliert Tippgeschwindigkeit (50-150ms pro Zeichen)
 */
export function typingDelay(textLength: number): number {
  return (textLength * (50 + Math.random() * 100)) / 1000; // in Sekunden
}

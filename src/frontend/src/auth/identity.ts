import type { AuthResponse, Guest, Host } from '../api/types'

/**
 * Wer gerade angemeldet ist. Host und Gast teilen sich denselben Speicherplatz, weil sie
 * sich gegenseitig ausschliessen: Ein Gerät ist entweder Gastgeber oder Gast auf einer
 * Party. Beide Rollen nutzen dasselbe Bearer-Token.
 */
export type Identity =
  | { kind: 'host'; token: string; expiresAt: string; host: Host }
  | { kind: 'guest'; token: string; expiresAt: string; guest: Guest }

const STORAGE_KEY = 'partypic.identity'

/**
 * Absichtlich localStorage und nicht die Cookie-Store-API: die gab es in der
 * Vorgängerversion nur in Chrome — auf iPhones warf der Zugriff einen ReferenceError,
 * womit der Beitritts-Dialog nie aufging und die Session-Seite tot war.
 */
export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const identity = JSON.parse(raw) as Identity
    if (!identity?.token || !identity.expiresAt) return null

    // Abgelaufene Tokens gar nicht erst zurückgeben — sonst zeigt die App eine
    // angemeldete Oberfläche, deren Aufrufe alle mit 401 zurückkommen.
    if (new Date(identity.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return identity
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function storeIdentity(response: AuthResponse): Identity {
  const identity: Identity = response.host
    ? { kind: 'host', token: response.token, expiresAt: response.expiresAt, host: response.host }
    : { kind: 'guest', token: response.token, expiresAt: response.expiresAt, guest: response.guest! }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  notify()
  return identity
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function getToken(): string | null {
  return loadIdentity()?.token ?? null
}

// Kleiner Abonnement-Mechanismus, damit useSyncExternalStore die Oberfläche aktualisiert,
// wenn sich die Identität ändert — auch wenn das aus dem API-Client heraus passiert
// (abgelaufenes Token) und nicht aus einem Klick.
const listeners = new Set<() => void>()

export function subscribeToIdentity(listener: () => void): () => void {
  listeners.add(listener)
  // Anmeldung in einem zweiten Tab soll hier ebenfalls ankommen.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Momentaufnahme für useSyncExternalStore. Der rohe String ist der Vergleichswert —
 * ein bei jedem Aufruf neu geparstes Objekt wäre nie referenzgleich und triebe React
 * in eine Endlosschleife aus Neu-Renders.
 */
export function identitySnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

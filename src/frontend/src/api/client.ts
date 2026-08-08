import { getToken, clearIdentity } from '../auth/identity'

/**
 * Fehler mit dem, was das Frontend wirklich braucht: Statuscode, ein anzeigbarer Text
 * und die Feldfehler aus einem ValidationProblemDetails. Damit kann ein Formular die
 * Meldung direkt unter das richtige Eingabefeld hängen.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** Erste Meldung zu einem Feld, für die Anzeige am Eingabefeld. */
  fieldError(field: string): string | undefined {
    const key = Object.keys(this.fieldErrors).find(k => k.toLowerCase() === field.toLowerCase())
    return key ? this.fieldErrors[key]?.[0] : undefined
  }
}

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

/**
 * Basis-URL: im Betrieb liefert dieselbe Anwendung API und Frontend aus, dort ist sie
 * leer. Nur der Vite-Devserver braucht sie — und der proxyt /api ohnehin, sodass auch
 * dann nichts gesetzt werden muss.
 */
const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // Ein 401 auf den Anmelde-Endpoints heisst "Passwort falsch" und nicht "Token
  // abgelaufen". Würde er hier abgefangen, bekäme man ausgerechnet auf dem
  // Anmeldebildschirm die Aufforderung, sich neu anzumelden — und die eigentliche
  // Meldung samt Feldfehlern ginge verloren.
  const isSignIn = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')

  if (response.status === 401 && !isSignIn) {
    // Abgelaufenes oder ungültiges Token: die gespeicherte Identität ist wertlos, sonst
    // läuft die App in eine Schleife aus 401ern, ohne je den Anmeldebildschirm zu zeigen.
    clearIdentity()
    throw new ApiError(401, 'Bitte neu anmelden.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response), await readFieldErrors(response))
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return (await response.json()) as T
}

// Die Antwort wird zweimal gelesen (Meldung + Feldfehler); ein Klon verhindert, dass der
// Body dabei schon verbraucht ist.
async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    return (await response.clone().json()) as ProblemDetails
  } catch {
    return null
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const problem = await readProblem(response)
  return problem?.detail ?? problem?.title ?? 'Da ist etwas schiefgegangen.'
}

async function readFieldErrors(response: Response): Promise<Record<string, string[]>> {
  return (await readProblem(response))?.errors ?? {}
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

/**
 * Lädt die Bilddatei per presigned URL direkt in den Objektspeicher — bewusst ohne
 * Authorization-Header: die Signatur steckt in der URL, ein zusätzlicher Header würde
 * die Prüfung auf S3-Seite zerreißen.
 */
export async function uploadToStorage(uploadUrl: string, blob: Blob, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })

  if (!response.ok) {
    throw new ApiError(response.status, 'Das Bild konnte nicht hochgeladen werden.')
  }
}

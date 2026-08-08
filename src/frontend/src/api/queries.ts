import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, uploadToStorage } from './client'
import type { AuthResponse, Gallery, Mission, Session, SessionPreview, SessionStats, UploadUrl } from './types'
import { storeIdentity } from '../auth/identity'

export const keys = {
  me: ['me'] as const,
  mySessions: ['sessions', 'mine'] as const,
  preview: (id: string) => ['session', id, 'preview'] as const,
  missions: (id: string) => ['session', id, 'missions'] as const,
  stats: (id: string) => ['session', id, 'stats'] as const,
  gallery: (id: string) => ['session', id, 'pictures'] as const,
}

// --- Gastgeber ---------------------------------------------------------------

export function useRegister() {
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      api.post<AuthResponse>('/api/auth/register', body),
    // Nach der Registrierung direkt angemeldet: die Vorgängerversion liess den Nutzer
    // hier stehen und verlangte eine zweite Eingabe derselben Daten.
    onSuccess: storeIdentity,
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<AuthResponse>('/api/auth/login', body),
    onSuccess: storeIdentity,
  })
}

export function useMySessions(enabled: boolean) {
  return useQuery({
    queryKey: keys.mySessions,
    queryFn: () => api.get<Session[]>('/api/sessions/mine'),
    enabled,
  })
}

export function useCreateSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string }) => api.post<Session>('/api/sessions', body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.mySessions }),
  })
}

export function useDeleteSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.delete<void>(`/api/sessions/${sessionId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.mySessions }),
  })
}

// --- Party -------------------------------------------------------------------

export function useSessionPreview(sessionId: string) {
  return useQuery({
    queryKey: keys.preview(sessionId),
    queryFn: () => api.get<SessionPreview>(`/api/sessions/${sessionId}`),
    retry: false,
  })
}

export function useJoinSession(sessionId: string) {
  return useMutation({
    mutationFn: (body: { username: string }) =>
      api.post<AuthResponse>(`/api/sessions/${sessionId}/join`, body),
    onSuccess: storeIdentity,
  })
}

export function useMissions(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.missions(sessionId),
    queryFn: () => api.get<Mission[]>(`/api/sessions/${sessionId}/missions`),
    enabled,
  })
}

export function useSetMissions(sessionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (missions: { id: string | null; description: string }[]) =>
      api.put<Mission[]>(`/api/sessions/${sessionId}/missions`, { missions }),
    onSuccess: data => {
      // Die Antwort trägt die serverseitig vergebenen Ids — direkt in den Cache, sonst
      // schickt das nächste Speichern die alten Platzhalter zurück.
      client.setQueryData(keys.missions(sessionId), data)
      client.invalidateQueries({ queryKey: keys.mySessions })
    },
  })
}

export function useSessionStats(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.stats(sessionId),
    queryFn: () => api.get<SessionStats>(`/api/sessions/${sessionId}/stats`),
    enabled,
    refetchInterval: 30_000,
  })
}

export function useGallery(sessionId: string, enabled: boolean, take: number) {
  return useQuery({
    queryKey: [...keys.gallery(sessionId), take],
    queryFn: () => api.get<Gallery>(`/api/sessions/${sessionId}/pictures?take=${take}`),
    enabled,
    // Die Bild-URLs sind eine Stunde signiert; alle 60 s neu laden hält die Galerie
    // aktuell, ohne dass jemand von Hand aktualisieren muss.
    refetchInterval: 60_000,
    // Beim Nachladen einer größeren Seite die bisherige stehen lassen — sonst blinkt die
    // ganze Galerie kurz auf einen Ladezustand zurück.
    placeholderData: previous => previous,
  })
}

export function useDeletePicture(sessionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (pictureId: string) =>
      api.delete<void>(`/api/sessions/${sessionId}/pictures/${pictureId}`),
    onSuccess: () => invalidateParty(client, sessionId),
  })
}

/**
 * Der dreistufige Upload als ein Aufruf: URL holen, direkt in den Speicher schieben,
 * beim Server bestätigen. Der Content-Type muss in allen drei Schritten identisch sein,
 * sonst passt die Signatur nicht mehr.
 */
export function useUploadPicture(sessionId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ blob, missionId }: { blob: Blob; missionId: string | null }) => {
      const upload = await api.post<UploadUrl>(`/api/sessions/${sessionId}/pictures/upload-url`, {
        contentType: blob.type,
        sizeBytes: blob.size,
      })

      await uploadToStorage(upload.uploadUrl, blob, blob.type)

      return api.post<unknown>(`/api/sessions/${sessionId}/pictures`, {
        objectKey: upload.objectKey,
        originalFilename: filenameFor(blob.type),
        missionId,
      })
    },
    onSuccess: () => invalidateParty(client, sessionId),
  })
}

function invalidateParty(client: QueryClient, sessionId: string): void {
  client.invalidateQueries({ queryKey: keys.gallery(sessionId) })
  client.invalidateQueries({ queryKey: keys.stats(sessionId) })
}

/**
 * Anzeigename der Datei. Bewusst ohne Doppelpunkte aus einem ISO-Zeitstempel — die sind
 * unter Windows in Dateinamen unzulässig — und mit Zufallsanteil, damit zwei Fotos aus
 * derselben Sekunde nicht denselben Namen tragen.
 */
function filenameFor(contentType: string): string {
  const extension = contentType.split('/')[1]?.split('+')[0] ?? 'jpg'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `partypic-${stamp}-${suffix}.${extension}`
}

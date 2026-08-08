import { useCallback, useEffect, useRef, useState } from 'react'

export type Facing = 'environment' | 'user'

type CameraState = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
  error: string | null
  facing: Facing
  canSwitch: boolean
  switchCamera: () => void
  retry: () => void
}

/**
 * Hält den Kamerastream — bewusst von Hand statt über react-webcam, weil nur so die
 * Auflösung begrenzt, zwischen den Kameras gewechselt und eine verweigerte Berechtigung
 * überhaupt gemeldet werden kann.
 *
 * @param active Der Stream läuft nur, solange die Kamera auch sichtbar ist. Weiterlaufen
 *   zu lassen hiesse: Aufnahmeleuchte an, Akku leer, und auf iOS pausiert das System den
 *   Stream ohnehin, sobald die Seite in den Hintergrund geht.
 */
export function useCamera(active: boolean): CameraState {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [canSwitch, setCanSwitch] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return

    let cancelled = false

    async function start() {
      setError(null)
      setReady(false)

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? 'Dieser Browser kann die Kamera nicht öffnen.'
            : 'Die Kamera braucht eine sichere Verbindung (HTTPS).',
        )
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            // Full-HD reicht für eine Galerie auf dem Handy und ist um ein Vielfaches
            // sparsamer als die maximale Sensorauflösung.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {
            // Auf iOS kann play() abgelehnt werden, wenn die Seite noch keine
            // Nutzerinteraktion gesehen hat — playsInline + muted im Markup fangen das
            // ab, und der nächste Tipp startet es sowieso.
          })
        }
        setReady(true)

        // Ein Anruf oder ein Wechsel in die Kamera-App beendet den Track dauerhaft. Ohne
        // diese Überwachung bliebe der Auslöser scharf und würde still das letzte
        // eingefrorene Bild hochladen — mit Erfolgsmeldung.
        for (const track of stream.getVideoTracks()) {
          track.addEventListener('ended', () => {
            if (cancelled) return
            setReady(false)
            setError('Die Kamera wurde unterbrochen.')
          })
        }

        // Erst nach erteilter Berechtigung liefert enumerateDevices echte Gerätedaten;
        // vorher wären die Labels leer und die Zählung unbrauchbar. Eigener Block, weil
        // ein Fehler hier den laufenden Sucher nicht als kaputt melden darf.
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          if (!cancelled) setCanSwitch(devices.filter(d => d.kind === 'videoinput').length > 1)
        } catch {
          if (!cancelled) setCanSwitch(false)
        }
      } catch (cause) {
        if (cancelled) return
        setError(describe(cause))
      }
    }

    void start()

    // Kommt die Seite aus dem Hintergrund zurück, prüfen, ob der Stream das überlebt hat,
    // und ihn sonst neu anfordern.
    const onVisible = () => {
      if (document.hidden || cancelled) return

      const live = streamRef.current?.getVideoTracks().some(t => t.readyState === 'live')
      if (!live) {
        setAttempt(n => n + 1)
        return
      }

      void videoRef.current?.play().catch(() => {})
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      for (const track of streamRef.current?.getTracks() ?? []) track.stop()
      streamRef.current = null
      setReady(false)
    }
  }, [active, facing, attempt])

  const switchCamera = useCallback(() => {
    setFacing(current => (current === 'environment' ? 'user' : 'environment'))
  }, [])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  return { videoRef, ready, error, facing, canSwitch, switchCamera, retry }
}

function describe(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Die Kamera ist blockiert. In den Browser-Einstellungen für diese Seite erlauben.'
    case 'NotFoundError':
      return 'Es wurde keine Kamera gefunden.'
    case 'NotReadableError':
      return 'Die Kamera wird gerade von einer anderen App benutzt.'
    default:
      return 'Die Kamera lässt sich nicht öffnen.'
  }
}

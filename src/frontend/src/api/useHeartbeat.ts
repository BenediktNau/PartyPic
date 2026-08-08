import { useEffect } from 'react'
import { api } from './client'

const INTERVAL_MS = 30_000

/**
 * Meldet den Gast alle 30 Sekunden als anwesend, damit die Online-Anzeige stimmt.
 *
 * Pausiert, sobald die Seite in den Hintergrund geht — im Vordergrund einer Feier liegt
 * das Handy die meiste Zeit in der Tasche, und ein Ping alle 30 s aus einem unsichtbaren
 * Tab kostet nur Akku. Anders als zuvor teilen sich Intervall und Sichtbarkeit einen
 * einzigen Effekt; die getrennten Effekte konnten sich gegenseitig das Handle
 * überschreiben und ein Intervall zurücklassen, das nie mehr abgeräumt wurde.
 */
export function useHeartbeat(sessionId: string, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    let timer: number | undefined

    const ping = () => {
      // Fehler bewusst geschluckt: ein verpasster Heartbeat ist kein Zustand, den
      // jemand sehen müsste, und der nächste kommt in 30 Sekunden.
      void api.post(`/api/sessions/${sessionId}/heartbeat`).catch(() => {})
    }

    const start = () => {
      if (timer !== undefined) return
      ping()
      timer = window.setInterval(ping, INTERVAL_MS)
    }

    const stop = () => {
      if (timer === undefined) return
      window.clearInterval(timer)
      timer = undefined
    }

    const onVisibility = () => (document.hidden ? stop() : start())

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [sessionId, enabled])
}

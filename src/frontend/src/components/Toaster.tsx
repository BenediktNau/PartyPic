import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type Tone } from './toast-context'

type Toast = { id: number; text: string; tone: Tone }

/**
 * Kurze Rückmeldungen am oberen Rand. Ersetzt die vorherigen alert()-Aufrufe und
 * console.error-Stellen: auf dem Handy blockiert ein alert() die ganze Seite, und ein
 * Fehler in der Konsole erreicht dort ohnehin niemanden.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((text: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(current => [...current, { id, text, tone }])
    window.setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 3500)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext value={value}>
      {children}
      <div
        // aria-live, damit Screenreader die Meldung vorlesen; pointer-events-none, damit
        // die Leiste nichts blockiert, was darunter liegt.
        aria-live="polite"
        // Unterhalb der Kopfzeile statt darüber: oben bündig verdeckte die Meldung den
        // Party-Namen und die Online-Anzeige genau dann, wenn etwas passiert ist.
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+4.25rem)] z-[200]
          flex flex-col items-center gap-2 px-4"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-sm rounded-full px-4 py-2 text-sm font-medium shadow-lg backdrop-blur ${
              toast.tone === 'good'
                ? 'bg-good/90 text-ink'
                : toast.tone === 'bad'
                  ? 'bg-bad/90 text-white'
                  : 'bg-surface-raised/95 text-white border border-line'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

// Die wenigen wiederkehrenden Bausteine der Oberfläche. Alle mit Mindestgrösse 44 px,
// weil sie auf einer Feier mit dem Daumen und nicht mit der Maus bedient werden.

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className = '', children, ...rest }: ButtonProps) {
  const base =
    'tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold ' +
    'transition active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100'

  const look = {
    primary: 'bg-accent text-white shadow-lg shadow-accent/25',
    ghost: 'bg-surface-raised text-white border border-line',
    danger: 'bg-bad/15 text-bad border border-bad/40',
  }[variant]

  return (
    // {...rest} steht bewusst VOR disabled: andersherum überschriebe ein mitgegebenes
    // disabled={false} den Lade-Zustand, und der Knopf bliebe während einer laufenden
    // Anfrage tippbar — auf langsamem WLAN führte das zu doppelten Absendungen.
    <button className={`${base} ${look} ${className}`} {...rest} disabled={loading || rest.disabled}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Lädt"
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Field({ label, error, className = '', id, ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-white placeholder:text-muted/60
          ${error ? 'border-bad' : 'border-line'} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-error`} className="mt-1.5 block text-sm text-bad">
          {error}
        </span>
      )}
    </label>
  )
}

type SheetProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose?: () => void
}

/**
 * Dialog, der auf dem Handy von unten kommt und auf breiten Displays mittig sitzt.
 * Ohne `onClose` lässt er sich nicht schliessen — für den Beitritt, bei dem es keinen
 * sinnvollen Weg daran vorbei gibt.
 */
export function Sheet({ open, title, children, onClose }: SheetProps) {
  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      // pointerdown statt mousedown: mousedown feuert auf Touchgeräten nur verzögert und
      // manchmal gar nicht — das Schliessen per Tipp daneben ging deshalb bisher ins Leere.
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface
          p-6 pb-safe shadow-2xl sm:max-w-md sm:rounded-3xl"
        onPointerDown={event => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Schliessen"
              className="tap -m-2 rounded-full p-2 text-muted"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        {icon}
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
      {children}
    </p>
  )
}

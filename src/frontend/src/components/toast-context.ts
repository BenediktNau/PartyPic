import { createContext } from 'react'

export type Tone = 'info' | 'good' | 'bad'

/**
 * Eigene Datei, damit Toaster.tsx ausschliesslich Komponenten exportiert — nur dann
 * funktioniert Fast Refresh im Entwicklungsbetrieb zuverlässig.
 */
export const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null)

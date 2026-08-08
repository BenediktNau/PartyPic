import { useMemo, useSyncExternalStore } from 'react'
import { identitySnapshot, loadIdentity, subscribeToIdentity, type Identity } from './identity'

/**
 * Die aktuelle Identität als React-Zustand. Kein Context-Provider nötig: die Quelle ist
 * ohnehin der localStorage, und über useSyncExternalStore bekommt jede Komponente
 * dieselbe Sicht — auch wenn das Token an anderer Stelle verworfen wurde.
 */
export function useIdentity(): Identity | null {
  const raw = useSyncExternalStore(subscribeToIdentity, identitySnapshot, () => null)

  // raw ist nur der Vergleichswert. Das Ergebnis wird daran gemerkt, damit die Identität
  // referenzstabil bleibt — sonst feuert jeder useEffect, der sie als Abhängigkeit hat,
  // bei jedem Render erneut.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- raw ist genau der Auslöser: er ändert sich, wenn sich die gespeicherte Identität ändert.
  return useMemo(() => loadIdentity(), [raw])
}

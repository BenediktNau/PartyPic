import { useRef, useState } from 'react'
import { useMissions, useSetMissions } from '../api/queries'
import type { Mission } from '../api/types'
import { Button, EmptyState, Spinner } from './ui'
import { useToast } from './useToast'
import { ShareCard } from './ShareCard'

/**
 * Der Bereich des Gastgebers: Missionen pflegen und den Party-Link teilen.
 * Missionen werden immer als vollständige Liste gespeichert; bestehende Ids bleiben
 * dabei erhalten, damit bereits hochgeladene Fotos ihre Zuordnung behalten.
 */
export function MissionsPane({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { data: missions, isPending } = useMissions(sessionId, active)
  const save = useSetMissions(sessionId)
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')

  const current: Mission[] = missions ?? []

  const persist = async (next: { id: string | null; description: string }[], done: string) => {
    try {
      await save.mutateAsync(next)
      toast(done, 'good')
    } catch {
      toast('Das liess sich nicht speichern.', 'bad')
    }
  }

  const add = async () => {
    const description = draft.trim()
    if (!description) return
    setDraft('')
    await persist([...toInput(current), { id: null, description }], 'Auftrag hinzugefügt')
  }

  const removeAt = async (id: string) =>
    persist(toInput(current.filter(m => m.id !== id)), 'Auftrag entfernt')

  const importFile = async (file: File | undefined) => {
    if (!file) return

    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 200)

    if (lines.length === 0) {
      toast('In der Datei stand nichts Verwertbares.', 'bad')
      return
    }

    await persist(
      [...toInput(current), ...lines.map(description => ({ id: null, description }))],
      `${lines.length} Aufträge übernommen`,
    )
  }

  if (isPending) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <section className="h-full overflow-y-auto overscroll-contain pb-8">
      <header className="sticky top-0 z-10 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
        <h2 className="font-display text-lg font-bold">
          Aufträge <span className="text-muted">· {current.length}</span>
        </h2>
      </header>

      <div className="space-y-6 p-4">
        <ShareCard sessionId={sessionId} />

        <div className="space-y-3">
          {/* Auf dem Handy untereinander statt nebeneinander: ein Eingabefeld neben zwei
              Knöpfen war zuvor auf 12rem gequetscht. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') void add()
              }}
              placeholder="z. B. Foto vom DJ"
              maxLength={200}
              aria-label="Neuer Auftrag"
              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-white placeholder:text-muted/60"
            />
            <Button onClick={() => void add()} disabled={!draft.trim()} loading={save.isPending}>
              Hinzufügen
            </Button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="tap w-full rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted"
          >
            Liste als .txt hochladen — ein Auftrag pro Zeile
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={event => {
              void importFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        {current.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="Noch keine Aufträge"
            hint="Ohne Aufträge knipsen die Gäste einfach frei drauflos — auch gut."
          />
        ) : (
          <ul className="space-y-2">
            {current.map(mission => (
              <li
                key={mission.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <span className="flex-1 text-balance">{mission.description}</span>
                <button
                  type="button"
                  onClick={() => void removeAt(mission.id)}
                  aria-label={`Auftrag "${mission.description}" entfernen`}
                  className="tap -mr-2 rounded-full px-3 text-muted"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function toInput(missions: Mission[]) {
  return missions.map(m => ({ id: m.id, description: m.description }))
}

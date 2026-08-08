import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeletePicture, useGallery } from '../api/queries'
import type { Picture } from '../api/types'
import { Button, EmptyState, Spinner } from './ui'
import { useToast } from './useToast'

/** Muss zu PartyOptions.MaxGalleryPageSize passen — darueber weist der Server ab. */
const MAX_PAGE_SIZE = 500

export function GalleryPane({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [pageSize, setPageSize] = useState(60)
  const { data, isPending, isError, refetch, isFetching } = useGallery(sessionId, active, pageSize)

  /** Das offene Bild wird über seine Id gehalten, nicht über die Position: die Liste ist
   *  nach Zeit absteigend sortiert und lädt alle 60 s nach, ein neues Foto würde sonst
   *  alles verschieben und dem Betrachter ein anderes Bild unterschieben. */
  const [openId, setOpenId] = useState<string | null>(null)

  const pictures = useMemo(() => data?.items ?? [], [data])

  if (isPending) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  // Nur wenn wirklich nichts da ist. Ein fehlgeschlagener Hintergrund-Abgleich — auf
  // Party-WLAN der Normalfall — darf keine volle Galerie durch eine Fehlermeldung ersetzen.
  if (isError && !data) {
    return (
      <div className="grid h-full place-items-center gap-4 p-8 text-center">
        <p className="text-muted">Die Galerie liess sich nicht laden.</p>
        <Button variant="ghost" onClick={() => void refetch()}>
          Nochmal versuchen
        </Button>
      </div>
    )
  }

  const shown = pictures.length
  const total = data?.total ?? shown

  return (
    <section className="h-full overflow-y-auto overscroll-contain">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
        <h2 className="font-display text-lg font-bold">
          Galerie <span className="text-muted">· {total}</span>
        </h2>
        <button
          type="button"
          onClick={() => void refetch()}
          className="tap rounded-full px-3 text-sm text-muted"
          aria-label="Galerie aktualisieren"
        >
          {isFetching ? <Spinner /> : 'Aktualisieren'}
        </button>
      </header>

      {isError && (
        <p className="px-4 py-2 text-center text-xs text-muted">
          Gerade keine Verbindung — angezeigt wird der letzte Stand.
        </p>
      )}

      {shown === 0 ? (
        <EmptyState icon="📸" title="Noch keine Fotos" hint="Wechsle zur Kamera und mach das erste." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-4">
            {pictures.map(picture => (
              <button
                key={picture.id}
                type="button"
                onClick={() => setOpenId(picture.id)}
                className="relative aspect-square overflow-hidden rounded-lg bg-surface active:opacity-80"
              >
                <img
                  src={picture.url}
                  alt={picture.missionDescription ?? `Foto von ${picture.userName}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-left text-xs">
                  {picture.userName}
                </span>
              </button>
            ))}
          </div>

          {/* Ohne diesen Knopf wären auf einer gut besuchten Feier alle Fotos jenseits
              der ersten Seite unerreichbar, obwohl die Kopfzeile sie mitzählt. */}
          {shown < total && (
            <div className="p-4">
              {pageSize < MAX_PAGE_SIZE ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  loading={isFetching}
                  onClick={() => setPageSize(n => Math.min(n + 60, MAX_PAGE_SIZE))}
                >
                  Weitere {Math.min(60, total - shown)} Fotos laden
                </Button>
              ) : (
                <p className="text-center text-sm text-muted">
                  Die neuesten {MAX_PAGE_SIZE} Fotos werden angezeigt.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {openId && pictures.some(p => p.id === openId) && (
        <Lightbox sessionId={sessionId} pictures={pictures} openId={openId} onOpenIdChange={setOpenId} />
      )}
    </section>
  )
}

type LightboxProps = {
  sessionId: string
  pictures: Picture[]
  openId: string
  onOpenIdChange: (id: string | null) => void
}

function Lightbox({ sessionId, pictures, openId, onOpenIdChange }: LightboxProps) {
  const index = pictures.findIndex(p => p.id === openId)
  const picture = pictures[index]

  const remove = useDeletePicture(sessionId)
  const toast = useToast()
  const touchStartX = useRef<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [saving, setSaving] = useState(false)

  const close = useCallback(() => onOpenIdChange(null), [onOpenIdChange])

  const go = useCallback(
    (delta: number) => {
      const next = pictures[index + delta]
      if (next) onOpenIdChange(next.id)
    },
    [index, pictures, onOpenIdChange],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)

    // Fokus in die Ansicht holen und beim Schliessen zurückgeben, damit die Bedienung
    // per Tastatur nicht hinter dem deckenden Overlay weiterläuft.
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [go, close])

  const onDelete = async () => {
    // Vor dem Löschen merken, wohin gesprungen wird — danach ist das Bild aus der Liste.
    const fallback = pictures[index + 1] ?? pictures[index - 1] ?? null

    try {
      await remove.mutateAsync(picture.id)
      toast('Foto gelöscht', 'good')
      onOpenIdChange(fallback?.id ?? null)
    } catch {
      toast('Das Foto liess sich nicht löschen.', 'bad')
    }
  }

  /** Der download-Hinweis wirkt bei fremder Herkunft nicht — eine presigned URL zeigt
   *  immer auf den Objektspeicher. Ohne diesen Umweg über einen Blob navigiert der
   *  Browser einfach zum Bild und die App ist weg. */
  const onSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(picture.url)
      if (!response.ok) throw new Error()

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `partypic-${picture.userName}-${picture.id.slice(0, 8)}.jpg`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast('Das Bild liess sich nicht speichern.', 'bad')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto von ${picture.userName}`}
      className="fixed inset-0 z-[150] flex flex-col bg-black"
      // Wischen zum Blättern: auf dem Handy die naheliegendste Geste, und die
      // Vorgängerversion bot gar keine Möglichkeit, ohne Schliessen weiterzublättern.
      onTouchStart={event => {
        touchStartX.current = event.touches[0].clientX
      }}
      onTouchEnd={event => {
        const start = touchStartX.current
        touchStartX.current = null
        if (start === null) return
        const delta = event.changedTouches[0].clientX - start
        if (Math.abs(delta) > 60) go(delta < 0 ? 1 : -1)
      }}
    >
      <div className="flex items-center justify-between gap-3 pt-safe px-4 pb-2">
        <span className="text-sm text-muted">
          {index + 1} / {pictures.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Schliessen"
          className="tap rounded-full px-3 text-xl"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-2">
        <img
          src={picture.url}
          alt={picture.missionDescription ?? `Foto von ${picture.userName}`}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="space-y-3 px-5 pb-safe pt-4">
        <div>
          <p className="font-semibold">{picture.userName}</p>
          {picture.missionDescription && <p className="text-sm text-accent">{picture.missionDescription}</p>}
          <p className="text-xs text-muted">
            {new Date(picture.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" loading={saving} onClick={() => void onSave()}>
            Speichern
          </Button>
          {picture.canDelete && (
            <Button variant="danger" onClick={() => void onDelete()} loading={remove.isPending}>
              Löschen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

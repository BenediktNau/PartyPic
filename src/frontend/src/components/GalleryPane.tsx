import { useCallback, useEffect, useRef, useState } from 'react'
import { useDeletePicture, useGallery } from '../api/queries'
import type { Picture } from '../api/types'
import { Button, EmptyState, Spinner } from './ui'
import { useToast } from './useToast'

export function GalleryPane({ sessionId, active }: { sessionId: string; active: boolean }) {
  const { data, isPending, isError, refetch, isFetching } = useGallery(sessionId, active)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const pictures = data?.items ?? []

  if (isPending) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid h-full place-items-center gap-4 p-8 text-center">
        <p className="text-muted">Die Galerie liess sich nicht laden.</p>
        <Button variant="ghost" onClick={() => void refetch()}>
          Nochmal versuchen
        </Button>
      </div>
    )
  }

  return (
    <section className="h-full overflow-y-auto overscroll-contain">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
        <h2 className="font-display text-lg font-bold">
          Galerie <span className="text-muted">· {data?.total ?? 0}</span>
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

      {pictures.length === 0 ? (
        <EmptyState icon="📸" title="Noch keine Fotos" hint="Wechsle zur Kamera und mach das erste." />
      ) : (
        <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-4">
          {pictures.map((picture, index) => (
            <button
              key={picture.id}
              type="button"
              onClick={() => setOpenIndex(index)}
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
      )}

      {openIndex !== null && pictures[openIndex] && (
        <Lightbox
          sessionId={sessionId}
          pictures={pictures}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  )
}

type LightboxProps = {
  sessionId: string
  pictures: Picture[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

function Lightbox({ sessionId, pictures, index, onIndexChange, onClose }: LightboxProps) {
  const picture = pictures[index]
  const remove = useDeletePicture(sessionId)
  const toast = useToast()
  const touchStartX = useRef<number | null>(null)

  const go = useCallback(
    (delta: number) => {
      const next = index + delta
      if (next >= 0 && next < pictures.length) onIndexChange(next)
    },
    [index, pictures.length, onIndexChange],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const onDelete = async () => {
    try {
      await remove.mutateAsync(picture.id)
      toast('Foto gelöscht', 'good')
      // Das letzte Bild schliesst die Ansicht, sonst zeigt sie auf einen leeren Index.
      if (pictures.length <= 1) onClose()
      else onIndexChange(Math.min(index, pictures.length - 2))
    } catch {
      toast('Das Foto liess sich nicht löschen.', 'bad')
    }
  }

  return (
    <div
      // Vollständig deckend: bei 95 % schimmerten Kopfzeile und Tab-Leiste durch das
      // Bild, was wie ein Darstellungsfehler aussah.
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
        <button type="button" onClick={onClose} aria-label="Schliessen" className="tap rounded-full px-3 text-xl">
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
          {picture.missionDescription && (
            <p className="text-sm text-accent">{picture.missionDescription}</p>
          )}
          <p className="text-xs text-muted">
            {new Date(picture.createdAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={picture.url}
            download
            className="tap flex flex-1 items-center justify-center rounded-2xl border border-line bg-surface-raised font-semibold"
          >
            Speichern
          </a>
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

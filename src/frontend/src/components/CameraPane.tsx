import { useCallback, useRef, useState } from 'react'
import { useCamera } from '../camera/useCamera'
import { captureFrame, prepareFile } from '../camera/capture'
import { useUploadPicture } from '../api/queries'
import type { Mission } from '../api/types'
import { Button, ErrorNote, Spinner } from './ui'
import { useToast } from './useToast'

type Props = {
  sessionId: string
  missions: Mission[]
  /** Nur wenn die Kamera auch sichtbar ist, läuft der Stream. */
  active: boolean
}

export function CameraPane({ sessionId, missions, active }: Props) {
  const { videoRef, ready, error, canSwitch, switchCamera, retry } = useCamera(active)
  const upload = useUploadPicture(sessionId)
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [flash, setFlash] = useState(false)
  const [missionIndex, setMissionIndex] = useState(0)

  const mission = missions.length > 0 ? missions[missionIndex % missions.length] : null

  const send = useCallback(
    async (blob: Blob) => {
      try {
        await upload.mutateAsync({ blob, missionId: mission?.id ?? null })
        toast('Foto ist in der Galerie', 'good')
        // Nach einem erledigten Auftrag der nächste — sonst knipsen alle dasselbe Motiv.
        if (missions.length > 0) setMissionIndex(i => i + 1)
      } catch {
        toast('Das Foto ging nicht durch. Nochmal versuchen?', 'bad')
      }
    },
    [upload, mission, missions.length, toast],
  )

  const shoot = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    setFlash(true)
    window.setTimeout(() => setFlash(false), 140)

    try {
      await send(await captureFrame(video))
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Das Foto konnte nicht aufgenommen werden.', 'bad')
    }
  }, [videoRef, send, toast])

  const pickFromGallery = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        await send(await prepareFile(file))
      } catch {
        toast('Dieses Bild lässt sich nicht verwenden.', 'bad')
      }
    },
    [send, toast],
  )

  return (
    <section className="relative flex h-full flex-col bg-black">
      {/* Der Auftrag steht über dem Sucher und nicht in einem eigenen Bereich: nur so
          sieht man beim Fotografieren, worum es geht. In der Vorgängerversion liessen
          sich Missionen zwar pflegen, wurden aber nirgends angezeigt. */}
      {mission && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe px-4">
          <div className="mx-auto max-w-md rounded-2xl bg-black/55 px-4 py-3 text-center backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-accent">Dein Auftrag</p>
            <p className="text-balance font-semibold">{mission.description}</p>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          // playsInline ist auf iOS zwingend — ohne das Attribut reisst Safari das Video
          // in den Vollbildplayer und der Auslöser ist nicht mehr erreichbar.
          playsInline
          muted
          autoPlay
          className="size-full object-cover"
        />

        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <Spinner className="size-8" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center gap-4 p-8">
            <div className="max-w-sm space-y-4 text-center">
              <ErrorNote>{error}</ErrorNote>
              <Button variant="ghost" onClick={retry}>
                Nochmal versuchen
              </Button>
              <p className="text-sm text-muted">
                Du kannst stattdessen auch ein Bild aus deiner Galerie hochladen.
              </p>
            </div>
          </div>
        )}

        {flash && <div className="absolute inset-0 z-30 bg-white" aria-hidden />}
      </div>

      <div className="relative z-20 flex items-center justify-between gap-6 px-8 pb-safe pt-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tap grid place-items-center rounded-full bg-white/10 p-3 text-2xl"
          aria-label="Foto aus dem Speicher wählen"
        >
          🖼️
        </button>

        <button
          type="button"
          onClick={shoot}
          disabled={!ready || upload.isPending}
          aria-label="Foto aufnehmen"
          className="grid size-20 place-items-center rounded-full bg-white ring-4 ring-white/30
            transition active:scale-90 disabled:opacity-40"
        >
          {upload.isPending ? (
            <Spinner className="size-7 text-ink" />
          ) : (
            <span className="size-16 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={switchCamera}
          disabled={!canSwitch}
          className="tap grid place-items-center rounded-full bg-white/10 p-3 text-2xl disabled:opacity-30"
          aria-label="Kamera wechseln"
        >
          🔄
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={event => {
          void pickFromGallery(event.target.files?.[0])
          // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
          event.target.value = ''
        }}
      />
    </section>
  )
}

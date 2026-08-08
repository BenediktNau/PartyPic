import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { useJoinSession, useMissions, useSessionPreview, useSessionStats } from '../api/queries'
import { useHeartbeat } from '../api/useHeartbeat'
import { useIdentity } from '../auth/useIdentity'
import { CameraPane } from '../components/CameraPane'
import { GalleryPane } from '../components/GalleryPane'
import { MissionsPane } from '../components/MissionsPane'
import { Button, EmptyState, ErrorNote, Field, Sheet, Spinner } from '../components/ui'

export const Route = createFileRoute('/party/$sessionId')({ component: Party })

type Tab = 'camera' | 'gallery' | 'missions'

function Party() {
  const { sessionId } = Route.useParams()
  const identity = useIdentity()
  const navigate = useNavigate()

  const preview = useSessionPreview(sessionId)

  // Wer ist hier drin? Ein Gast mit passendem Session-Claim oder der angemeldete
  // Gastgeber. Alles andere sieht den Beitritts-Dialog.
  const isGuestHere = identity?.kind === 'guest' && identity.guest.sessionId === sessionId
  const isHost = identity?.kind === 'host'
  const isMember = isGuestHere || isHost

  const [tab, setTab] = useState<Tab>('camera')

  const stats = useSessionStats(sessionId, isMember)
  const { data: missions } = useMissions(sessionId, isMember)
  useHeartbeat(sessionId, isGuestHere)

  if (preview.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (preview.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="space-y-4 text-center">
          <EmptyState icon="🔍" title="Diese Party gibt es nicht" hint="Vielleicht ist der Link nicht vollständig." />
          <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>
            Zur Startseite
          </Button>
        </div>
      </div>
    )
  }

  const party = preview.data

  if (!isMember) {
    return <JoinScreen sessionId={sessionId} partyName={party.name} hasEnded={party.hasEnded} />
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 pt-safe pb-2">
        <div className="min-w-0">
          <p className="truncate font-display font-bold">{party.name}</p>
          <p className="text-xs text-muted">
            {stats.data ? `${stats.data.photoCount} Fotos · ${stats.data.onlineGuests} online` : '…'}
            {party.hasEnded && ' · vorbei'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="tap shrink-0 rounded-full px-3 text-sm text-muted"
        >
          Start
        </button>
      </header>

      {/* Nur der aktive Bereich hängt im Baum: eine Kamera, die im Hintergrund
          weiterläuft, kostet Akku und lässt die Aufnahmeleuchte an. */}
      <main className="min-h-0 flex-1">
        {party.hasEnded && tab === 'camera' ? (
          <EmptyState
            icon="🌅"
            title="Die Party ist vorbei"
            hint="Neue Fotos gehen nicht mehr — die Galerie bleibt aber."
          />
        ) : tab === 'camera' ? (
          <CameraPane sessionId={sessionId} missions={missions ?? []} active />
        ) : tab === 'gallery' ? (
          <GalleryPane sessionId={sessionId} active />
        ) : (
          <MissionsPane sessionId={sessionId} active />
        )}
      </main>

      <nav className="flex border-t border-line bg-ink pb-safe" aria-label="Bereiche">
        <TabButton current={tab} value="camera" onSelect={setTab} icon="📷" label="Kamera" />
        <TabButton current={tab} value="gallery" onSelect={setTab} icon="🖼️" label="Galerie" />
        {isHost && <TabButton current={tab} value="missions" onSelect={setTab} icon="🎯" label="Aufträge" />}
      </nav>
    </div>
  )
}

function TabButton({
  current,
  value,
  onSelect,
  icon,
  label,
}: {
  current: Tab
  value: Tab
  onSelect: (tab: Tab) => void
  icon: string
  label: string
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-current={active ? 'page' : undefined}
      className={`tap flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition
        ${active ? 'text-accent' : 'text-muted'}`}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  )
}

function JoinScreen({
  sessionId,
  partyName,
  hasEnded,
}: {
  sessionId: string
  partyName: string
  hasEnded: boolean
}) {
  const join = useJoinSession(sessionId)
  const [username, setUsername] = useState('')
  const error = join.error as ApiError | null

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-black">{partyName}</h1>
        <p className="mt-2 text-muted">
          {hasEnded ? 'Diese Party ist schon vorbei.' : 'Sag kurz, wie du heisst — dann geht es los.'}
        </p>
      </div>

      <Sheet open={!hasEnded} title="Mitmachen">
        <form
          onSubmit={event => {
            event.preventDefault()
            join.mutate({ username: username.trim() })
          }}
          className="space-y-4"
        >
          <Field
            label="Dein Name"
            value={username}
            onChange={event => setUsername(event.target.value)}
            placeholder="z. B. Anna"
            maxLength={50}
            autoComplete="nickname"
            autoFocus
            error={error?.fieldError('username')}
          />

          <p className="text-sm text-muted">
            Kein Account nötig. Mit demselben Namen kommst du später wieder hinein.
          </p>

          {error && Object.keys(error.fieldErrors).length === 0 && <ErrorNote>{error.message}</ErrorNote>}

          <Button type="submit" className="w-full" loading={join.isPending} disabled={!username.trim()}>
            Los geht's
          </Button>
        </form>
      </Sheet>
    </div>
  )
}

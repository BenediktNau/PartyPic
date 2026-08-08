import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { useCreateSession, useDeleteSession, useLogin, useMySessions, useRegister } from '../api/queries'
import { clearIdentity } from '../auth/identity'
import { useIdentity } from '../auth/useIdentity'
import { Button, EmptyState, ErrorNote, Field, Spinner } from '../components/ui'
import { useToast } from '../components/useToast'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const identity = useIdentity()

  // Ein Gast, der die Startseite öffnet, gehört zurück auf seine Party und nicht auf
  // einen Anmeldebildschirm, mit dem er nichts anfangen kann.
  if (identity?.kind === 'guest') {
    return <BackToParty sessionId={identity.guest.sessionId} name={identity.guest.name} />
  }

  return identity?.kind === 'host' ? <HostArea /> : <Welcome />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-5 pb-safe pt-safe">
      <header className="pt-6">
        <h1 className="font-display text-4xl font-black tracking-tight">
          Party<span className="text-accent">Pic</span>
        </h1>
        <p className="mt-1 text-muted">Alle knipsen, eine Galerie.</p>
      </header>
      {children}
    </div>
  )
}

function BackToParty({ sessionId, name }: { sessionId: string; name: string }) {
  const navigate = useNavigate()

  return (
    <Shell>
      <div className="space-y-4 rounded-3xl border border-line bg-surface p-6">
        <p>
          Du bist als <strong>{name}</strong> dabei.
        </p>
        <Button className="w-full" onClick={() => void navigate({ to: '/party/$sessionId', params: { sessionId } })}>
          Zurück zur Party
        </Button>
        <Button variant="ghost" className="w-full" onClick={clearIdentity}>
          Abmelden
        </Button>
      </div>
    </Shell>
  )
}

function Welcome() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const login = useLogin()
  const register = useRegister()
  const pending = login.isPending || register.isPending
  const error = (login.error ?? register.error) as ApiError | null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (mode === 'login') login.mutate({ email: form.email, password: form.password })
    else register.mutate(form)
  }

  return (
    <Shell>
      <p className="text-balance text-lg">
        Als Gast brauchst du keinen Account — öffne einfach den Link deines Gastgebers.
        Zum <em>Veranstalten</em> reicht diese Anmeldung.
      </p>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-surface p-6">
        {mode === 'register' && (
          <Field
            label="Dein Name"
            value={form.name}
            autoComplete="name"
            onChange={event => setForm({ ...form, name: event.target.value })}
            error={error?.fieldError('name')}
          />
        )}

        <Field
          label="E-Mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={form.email}
          onChange={event => setForm({ ...form, email: event.target.value })}
          error={error?.fieldError('email')}
        />

        <Field
          label="Passwort"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={form.password}
          onChange={event => setForm({ ...form, password: event.target.value })}
          error={error?.fieldError('password')}
        />

        {/* Nur die allgemeine Meldung, wenn sie nicht schon an einem Feld hängt. */}
        {error && Object.keys(error.fieldErrors).length === 0 && <ErrorNote>{error.message}</ErrorNote>}

        <Button type="submit" className="w-full" loading={pending}>
          {mode === 'login' ? 'Anmelden' : 'Account anlegen'}
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="tap w-full text-sm text-muted"
        >
          {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon dabei? Anmelden'}
        </button>
      </form>
    </Shell>
  )
}

function HostArea() {
  const identity = useIdentity()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: sessions, isPending } = useMySessions(true)
  const create = useCreateSession()
  const remove = useDeleteSession()
  const [name, setName] = useState('')

  const start = async () => {
    try {
      const session = await create.mutateAsync({ name: name.trim() || 'Meine Party' })
      setName('')
      await navigate({ to: '/party/$sessionId', params: { sessionId: session.id } })
    } catch {
      toast('Die Party liess sich nicht anlegen.', 'bad')
    }
  }

  return (
    <Shell>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') void start()
          }}
          placeholder="Name der Party"
          maxLength={120}
          aria-label="Name der Party"
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-white placeholder:text-muted/60"
        />
        <Button onClick={() => void start()} loading={create.isPending}>
          Neue Party
        </Button>
      </div>

      {isPending ? (
        <div className="grid place-items-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <ul className="space-y-3">
          {sessions.map(session => {
            const over = new Date(session.endsAt).getTime() <= Date.now()
            return (
              <li key={session.id} className="rounded-3xl border border-line bg-surface p-5">
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/party/$sessionId', params: { sessionId: session.id } })}
                  className="w-full text-left"
                >
                  <p className="font-display text-lg font-bold">{session.name}</p>
                  <p className="text-sm text-muted">
                    {session.photoCount} Fotos · {session.guestCount} Gäste ·{' '}
                    {over
                      ? 'vorbei'
                      : `bis ${new Date(session.endsAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}`}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Bewusst mit Rückfrage: das löscht die Fotos aller Gäste mit.
                    if (confirm(`"${session.name}" mit allen Fotos löschen?`)) remove.mutate(session.id)
                  }}
                  className="tap mt-2 -ml-1 rounded-full px-2 text-sm text-muted"
                >
                  Party löschen
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="🎉" title="Noch keine Party" hint="Leg oben eine an und teile den Link." />
      )}

      <Button variant="ghost" className="mt-auto mb-4" onClick={clearIdentity}>
        Abmelden ({identity?.kind === 'host' ? identity.host.email : ''})
      </Button>
    </Shell>
  )
}

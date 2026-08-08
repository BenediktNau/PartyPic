import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from './ui'
import { useToast } from './useToast'

/**
 * Der Party-Link zum Weitergeben. Ein QR-Code ist auf einer Feier der einzige realistische
 * Weg: eine UUID abzutippen macht niemand, und ein Messenger ist nicht immer zur Hand.
 */
export function ShareCard({ sessionId }: { sessionId: string }) {
  const url = `${window.location.origin}/party/${sessionId}`
  const [qr, setQr] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      // Heller Code auf weissem Grund: ein invertierter QR-Code wird von vielen
      // Kamera-Apps schlicht nicht erkannt.
      color: { dark: '#0b0a12', light: '#ffffff' },
    })
      .then(dataUrl => {
        if (!cancelled) setQr(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQr(null)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  const share = async () => {
    // Der native Teilen-Dialog ist auf dem Handy der kürzeste Weg in jeden Messenger;
    // ohne ihn bleibt das Kopieren in die Zwischenablage.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PartyPic', text: 'Mach mit und lade deine Fotos hoch:', url })
        return
      } catch {
        // Abgebrochen — das ist keine Fehlermeldung wert.
        return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast('Link kopiert', 'good')
    } catch {
      toast('Der Link liess sich nicht kopieren.', 'bad')
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-line bg-surface p-5 text-center">
      <p className="font-display font-bold">Gäste einladen</p>

      {qr && (
        <img
          src={qr}
          alt="QR-Code zum Beitreten der Party"
          className="mx-auto aspect-square w-44 rounded-2xl bg-white p-2"
        />
      )}

      <p className="break-all text-xs text-muted">{url}</p>

      <Button onClick={() => void share()} className="w-full">
        Link teilen
      </Button>
    </div>
  )
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/**
 * Adresse der API im Entwicklungsbetrieb. Der Aspire-AppHost reicht sie per Umgebung
 * durch; ohne Aspire greift der Standard-Port von `dotnet run`.
 */
const apiTarget =
  process.env.API_HTTPS ??
  process.env.API_HTTP ??
  process.env.services__api__https__0 ??
  process.env.services__api__http__0 ??
  'http://localhost:5290'

/**
 * HTTPS im Entwicklungsbetrieb nur auf Ansage. getUserMedia verweigert die Kamera auf
 * jedem Gerät, das nicht localhost ist — fürs Handy im WLAN braucht es also ein
 * Zertifikat. Auf dem Rechner selbst zählt `http://localhost` schon als sicherer Kontext,
 * dort läuft die Kamera ohne. Das ist der Normalfall, und er darf nicht daran scheitern,
 * dass mkcert beim ersten Start seine CA per `sudo` ins System-Trust-Store schreiben
 * will: unter `aspire run` hängt kein Terminal am Prozess, das Passwort kann niemand
 * eingeben, und der Devserver bricht ab, bevor er lauscht.
 *
 * Fürs Handy einmalig die CA installieren (fragt nach dem Passwort) …
 *
 *   ~/.vite-plugin-mkcert/mkcert -install
 *
 * … danach reicht `VITE_HTTPS=1 npm run dev` bzw. dieselbe Variable vor `aspire run`.
 */
const useHttps = process.env.VITE_HTTPS === '1'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    ...(useHttps ? [mkcert()] : []),
  ],
  server: {
    // Am LAN lauschen, damit das Handy den Devserver erreicht.
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // Das mkcert-Zertifikat der API ist selbst signiert.
        secure: false,
      },
    },
  },
  build: {
    // Quellkarten auch im Release: die App ist klein, und ein Fehlerbericht vom Handy
    // ist ohne sie wertlos.
    sourcemap: true,
  },
})

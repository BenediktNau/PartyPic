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

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    // HTTPS auch im Entwicklungsbetrieb: getUserMedia verweigert die Kamera auf jedem
    // Gerät, das nicht localhost ist — ohne Zertifikat lässt sich also nicht am Handy testen.
    mkcert(),
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

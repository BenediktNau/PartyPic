import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import { ToastProvider } from './components/Toaster'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Auf einer Feier hängt das Handy an überlastetem WLAN. Ein zweiter Versuch ist
      // sinnvoll, endloses Nachbohren nicht — und beim Zurückholen der App soll die
      // Galerie frisch sein.
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)

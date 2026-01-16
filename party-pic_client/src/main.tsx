import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen.ts'
import { AuthProvider } from './auth.context.tsx'
const queryClient = new QueryClient()

const router = createRouter({ routeTree })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <div className='bg-gray-900 text-white h-screen'>
          <RouterProvider router={router} />
        </div>
      </QueryClientProvider>
      </AuthProvider>
  </StrictMode >,
)

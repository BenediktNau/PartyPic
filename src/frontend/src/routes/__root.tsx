import { createRootRoute, Outlet } from '@tanstack/react-router'
import { EmptyState } from '../components/ui'

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <EmptyState icon="🤔" title="Diese Seite gibt es nicht" hint="Prüf den Link, den du bekommen hast." />
  ),
})

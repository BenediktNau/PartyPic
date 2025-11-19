import { createFileRoute } from '@tanstack/react-router'
import CameraView from '../views/camera.view'

export const Route = createFileRoute('/session')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CameraView />
}

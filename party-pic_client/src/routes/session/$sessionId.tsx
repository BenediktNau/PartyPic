import { createFileRoute } from '@tanstack/react-router'
import CameraView from '../../views/camera.view'


export const Route = createFileRoute('/session/$sessionId')({
    component: RouteComponent,
})

function RouteComponent() {
    const { sessionId } = Route.useParams()
    return <div>Welcome to Session {sessionId}<CameraView /></div>
}

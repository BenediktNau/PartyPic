import { createFileRoute } from '@tanstack/react-router'
import CameraView from '../../views/camera.view'
import { useRef, useState } from 'react'
import SessionContext from '../../utils/contexts/session.context'
import { useAuth } from '../../auth.context'
import AdminPage from '../../views/admin.view'
import type { Session } from '../../models/sessions/session.model'
import Modal from '../../components/Modal/Modal.comp'
import { loginSessionUser } from '../../api/session/session.api'
const MainView = () => <div className="w-full h-full bg-white text-black flex items-center justify-center">🏠 Main Feed</div>;

export const Route = createFileRoute('/session/$sessionId')({
    component: RouteComponent,
})

function RouteComponent() {
    const { sessionId } = Route.useParams()

    const [session, setSession] = useState<Session>({
        sessionId: sessionId,
        sessionSettings: {},
        sessionMissions: []
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Helper to scroll to a specific "page" (0 = Camera, 1 = Main, 2 = Settings)
    const scrollToPage = (pageIndex: number) => {
        if (scrollContainerRef.current) {
            const width = window.innerWidth;
            scrollContainerRef.current.scrollTo({
                left: width * pageIndex,
                behavior: 'smooth'
            });
        }
    };
    const auth = useAuth();


    return (
        <SessionContext.Provider value={session}>

            {/* OVERLAY UI: Buttons to navigate programmatically 
         (These sit "on top" of the scrolling views)
      */}
            <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center gap-4 pointer-events-none">
                {auth.isAuthenticated ? <button
                    onClick={() => scrollToPage(0)}
                    className="pointer-events-auto px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg"
                >
                    Settings
                </button> : ""}
                <button
                    onClick={() => scrollToPage(auth.isAuthenticated ? 1 : 0)}
                    className="pointer-events-auto px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg"
                >
                    Camera
                </button>
                <button
                    onClick={() => scrollToPage(auth.isAuthenticated ? 2 : 1)}
                    className="pointer-events-auto px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg"
                >
                    Gallery
                </button>
            </div>

            {/* SCROLL CONTAINER 
          snap-x: Enables horizontal snapping
          snap-mandatory: Forces the view to stop exactly on a page, never in between
      */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto w-screen h-screen snap-x snap-mandatory no-scrollbar scroll-smooth"
            >
                {/* VIEW 3: SETTINGS (Right) */}
                {auth.isAuthenticated ? <div className="w-screen h-screen shrink-0 snap-center">
                    <AdminPage />
                </div> : <div ></div>}

                {/* VIEW 1: CAMERA (Left) */}
                <div className="w-screen h-screen shrink-0 snap-center">
                    <CameraView sessionId={sessionId} />
                </div>

                {/* VIEW 2: MAIN (Center - Default) */}
                <div className="w-screen h-screen shrink-0 snap-center relative">
                    <MainView />
                </div>

                <Modal title="Login" onClose={() => {console.log("gogo Gaga")}} makeOnCloseOptional={true} open={true} >
                    <p>Falls du noch nicht deinen Namen veraten hast, oder wir den Namen vergessen haben, gib ihn bitte nochmal an:</p>
                    <form className="mt-4" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const username = formData.get("username") as string;
                        loginSessionUser(username).then((user) => {
                            console.log("Eingeloggter User:", user);
                            e.currentTarget.reset();
                        });

                    }}>
                        <input type="text" name="username" placeholder="Dein Name" className="w-full p-2 rounded border border-gray-300 mb-4 text-black" required />
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Absenden</button>
                    </form>
                </Modal>

            </div>
        </SessionContext.Provider>
    )
}

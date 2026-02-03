import { createFileRoute } from "@tanstack/react-router";
import CameraView from "../../views/camera.view";
import GalleryView from "../../views/gallery.view";
import { useEffect, useRef, useState } from "react";
import SessionContext from "../../utils/contexts/session.context";
import { useAuth } from "../../auth.context";
import AdminPage from "../../views/admin.view";
import type { Session } from "../../models/sessions/session.model";
import Modal from "../../components/Modal/Modal.comp";
import {
  loginSessionUserWithId,
  registerSessionUser,
} from "../../api/session/session.api";
import type { session_User } from "../../models/sessions/session_user.model";
import { useHeartbeat } from "../../utils/hooks/useHeartbeat";

export const Route = createFileRoute("/session/$sessionId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionId } = Route.useParams();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [sessionUser, setSessionUser] = useState<session_User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cameraPageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Heartbeat für Online-Status (läuft im Hintergrund)
  useHeartbeat(sessionUser?.id || null);

  useEffect(() => {
    cookieStore.get("sessionUserId").then((cookie) => {
      if (cookie && cookie.value) {
        loginSessionUserWithId(cookie.value, sessionId)
          .then((user) => {
            console.log("Logged in session user from cookie:", user);
            setSessionUser(user);
          })
          .catch((error) => {
            console.error(
              "Fehler beim Anmelden des Session-Benutzers mit Cookie:",
              error
            );
            setModalOpen(true);
          });
      } else {
        setModalOpen(true);
      }
    });
  }, [sessionId]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // If >50% of the camera view is visible, consider it active
        setIsCameraActive(entry.isIntersecting);
      },
      {
        root: scrollContainerRef.current, // Watch scrolling within this container
        threshold: 0.5, // Trigger when 50% of the element is visible
      }
    );

    if (cameraPageRef.current) {
      observer.observe(cameraPageRef.current);
    }

    return () => {
      if (cameraPageRef.current) {
        observer.unobserve(cameraPageRef.current);
      }
    };
  }, []); 

  const [session,] = useState<Session>({
    sessionId: sessionId,
    sessionSettings: {},
    sessionMissions: [],
  });

  // Helper to scroll to a specific "page" (0 = Camera, 1 = Main, 2 = Settings)
  const scrollToPage = (pageIndex: number) => {
    if (scrollContainerRef.current) {
      const width = window.innerWidth;
      scrollContainerRef.current.scrollTo({
        left: width * pageIndex,
        behavior: "smooth",
      });
    }
  };
  const auth = useAuth();

  return (
    <SessionContext.Provider value={session}>
      <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center gap-4 pointer-events-none">
        {auth.isAuthenticated ? (
          <button
            onClick={() => scrollToPage(0)}
            className="pointer-events-auto px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg"
          >
            Settings
          </button>
        ) : (
          ""
        )}
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
        {auth.isAuthenticated ? (
          <div className="w-screen h-screen shrink-0 snap-center">
            <AdminPage />
          </div>
        ) : (
          <div></div>
        )}

        {/* VIEW 1: CAMERA */}
        <div 
          ref={cameraPageRef} 
          className="w-screen h-screen shrink-0 snap-center"
        >
          <CameraView 
            sessionId={sessionId} 
            cameraOn={isCameraActive}
            userName={sessionUser?.user_name}
          />
        </div>

        {/* VIEW 2: GALLERY */}
        <div className="w-screen h-screen shrink-0 snap-center relative">
          <GalleryView sessionId={sessionId} />
        </div>

        <Modal
          title="Login"
          onClose={() => {
          }}
          makeOnCloseOptional={true}
          open={modalOpen}
        >
          <p>Bitte gib einen Namen an ;D:</p>
          <form
            className="mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get("username") as string;
              const newSessionUser: session_User = await registerSessionUser(
                username,
                sessionId
              );

              console.log("Registered session user:", newSessionUser);

              setModalOpen(false);
              document.cookie = `sessionUserId=${newSessionUser.id}; path=/; max-age=${60 * 60 * 24 * 7}`;
              setSessionUser(newSessionUser);
            }}
          >
            <input
              type="text"
              name="username"
              placeholder="Dein Name"
              className="w-full p-2 rounded border border-gray-300 mb-4 text-black"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Absenden
            </button>
          </form>
        </Modal>
      </div>
    </SessionContext.Provider>
  );
}

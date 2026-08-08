import { useEffect, useRef } from 'react';
import { sendHeartbeat } from '../../api/session/session.api';

const HEARTBEAT_INTERVAL = 30000; // 30 Sekunden

/**
 * Hook für automatisches Heartbeat-Senden im Hintergrund.
 * Der User merkt nichts davon, aber der Server weiß, dass er online ist.
 */
export function useHeartbeat(userId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) {
      // Kein User eingeloggt, kein Heartbeat
      return;
    }

    // Sofort beim Mount einen Heartbeat senden
    sendHeartbeat(userId);

    // Dann alle 30 Sekunden
    intervalRef.current = setInterval(() => {
      sendHeartbeat(userId);
    }, HEARTBEAT_INTERVAL);

    // Cleanup beim Unmount oder wenn userId sich ändert
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId]);

  // Auch beim Schließen des Fensters/Tabs den Interval stoppen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab ist nicht mehr sichtbar - Interval pausieren
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (userId) {
        // Tab ist wieder sichtbar - Heartbeat wieder starten
        sendHeartbeat(userId);
        intervalRef.current = setInterval(() => {
          sendHeartbeat(userId);
        }, HEARTBEAT_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
}

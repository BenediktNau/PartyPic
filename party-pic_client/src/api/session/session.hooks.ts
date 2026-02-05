
import { useNavigate } from "@tanstack/react-router";
import { createSession, getSession, setMissionsAsync } from "./session.api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { mission, MissionsResponse } from "../../models/sessions/missions.model";
import { useContext } from "react";
import SessionContext from "../../utils/contexts/session.context";

export const useCreateSession = () => {

    const navigate = useNavigate();

    return useMutation<any, Error, void>({
        mutationFn: async () => {
            console.log("Creating session...");
            return await createSession()
        },

        onSuccess: (data) => {
            console.log(data.message + ", SessionId: " + data.sessionId);
            navigate({ to: "/session/" + data.sessionId });
        },
        onError: (error) => {
            console.error("Session-Erstellung fehlgeschlagen:", error);
        }
    });
}

export const useSetMissions = () => {
    const { sessionId } = useContext(SessionContext);
    const queryClient = useQueryClient();

    return useMutation<any, Error, MissionsResponse>({
        mutationFn: async (missions: MissionsResponse) => {
            if (!sessionId) throw new Error("No Session ID available");
            // Wir übergeben die sessionId hier explizit an die API
            return await setMissionsAsync(missions, sessionId);
        },
        onSuccess: () => {
            // Optional: Aktualisiert die Missions-Daten nach dem Speichern automatisch
            queryClient.invalidateQueries({ queryKey: ["missions", sessionId] });
        }
    });
};

export const useGetSession = () => {
    const { sessionId } = useContext(SessionContext);

    return useQuery({
        // Der Key identifiziert die Daten (wichtig für Caching)
        queryKey: ["missions", sessionId], 
        
        // Die Funktion wird nur ausgeführt, wenn wir eine SessionId haben
        queryFn: async () => {
            if (!sessionId) throw new Error("No Session ID");
            const session = await getSession(sessionId);

            return session;
        },
        
        // 'enabled' verhindert, dass der Request feuert, bevor die ID da ist
        enabled: !!sessionId, 
    });
};


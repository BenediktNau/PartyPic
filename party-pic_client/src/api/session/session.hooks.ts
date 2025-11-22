
import { useNavigate } from "@tanstack/react-router";
import { createSession } from "./session.api"
import { useMutation } from "@tanstack/react-query";

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
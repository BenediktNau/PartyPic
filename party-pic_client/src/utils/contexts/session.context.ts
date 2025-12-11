import { createContext } from "react";

export interface SessionContextType {
    sessionId: string | null;
    sessionSettings: Record<string, any>;
};

const SessionContext = createContext<SessionContextType>({
    sessionId: null,
    sessionSettings: {},
});

export default SessionContext;
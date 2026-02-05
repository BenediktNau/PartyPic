import { createContext } from "react";
import type { Session } from "../../models/sessions/session.model";

const SessionContext = createContext<Session>({
  sessionId: null,
  sessionSettings: {},
  sessionMissions: { data: [] },
});

export default SessionContext;

import type { mission } from "./missions.model";

export interface Session{
    sessionId: string | null;
    sessionSettings: Record<string, any>;
    sessionMissions: mission[];
}
import type { mission } from "../../models/sessions/missions.model.ts"
import axios from "../api-client.ts"
import type { Session } from "../../models/sessions/session.model.ts"


export const createSession = async () => {
    const response = await axios.post("/sessions/create")
    return response.data

} 

export const getSession = async (sessionId : string) => {
    const response = await axios.get("/sessions/get", {params: {sessionId: sessionId}})
    console.log(response.data)
    const returnedSession: Session = {sessionId: response.data.id, sessionSettings: response.data.settings, sessionMissions: response.data.missions};
    
    return returnedSession
}


export const setMissionsAsync = async (missions: mission[], sessionId: string) => {
    // sessionId wird als Argument übergeben
    const response = await axios.post("/sessions/setmissions", { missions, sessionId })
    return response.data
}

export const registerSessionUser = async (username: string, sessionId: string) => {
    const response = await axios.post('/sessions/registerSessionUser', { username, sessionId });
    return response.data;
}

export const loginSessionUserWithId = async (userId: string, sessionId: string) => {
    const response = await axios.post('/sessions/loginSessionUser', { userId, sessionId});
    return response.data;
}

// Heartbeat für Online-Status (wird alle 30s im Hintergrund aufgerufen)
export const sendHeartbeat = async (userId: string) => {
    try {
        await axios.post('/sessions/heartbeat', { userId });
    } catch (error) {
        // Fehler still ignorieren, da Heartbeat nicht kritisch ist
        console.debug('Heartbeat failed:', error);
    }
}
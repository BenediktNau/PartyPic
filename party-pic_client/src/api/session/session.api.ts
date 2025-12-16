import { useContext } from "react"
import type { mission } from "../../models/sessions/missions.model.ts"
import SessionContext from "../../utils/contexts/session.context.ts"
import axios from "../api-client.ts"
import type { Session } from "../../models/sessions/session.model.ts"


export const createSession = async () => {
    const response = await axios.post("/sessions/create")
    return response.data

} 

export const getSession = async (sessionId : string) => {
    const response = await axios.get("/sessions/get", {params: {sessionId: sessionId}})
    const returnedSession: Session = response.data
    return returnedSession
}


export const setMissionsAsync = async (missions: mission[], sessionId: string) => {
    // sessionId wird als Argument übergeben
    const response = await axios.post("/sessions/setmissions", { missions, sessionId })
    return response.data
}
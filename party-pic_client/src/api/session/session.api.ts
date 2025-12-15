import { useContext } from "react"
import type { mission } from "../../models/sessions/missions.model.ts"
import SessionContext from "../../utils/contexts/session.context.ts"
import axios from "../api-client.ts"


export const createSession = async () => {
    const response = await axios.post("/sessions/create")
    return response.data

} 

export const getMissions = async (sessionId : string) => {
    const response = await axios.get("/sessions/get", {params: {sessionId: sessionId}})
    return response.data
}


export const setMissionsAsync = async (missions: mission[], sessionId: string) => {
    // sessionId wird als Argument übergeben
    const response = await axios.post("/sessions/setmissions", { missions, sessionId })
    return response.data
}
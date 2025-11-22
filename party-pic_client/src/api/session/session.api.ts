import axios from "../api-client.ts"


export const createSession = async () => {
    const response = await axios.post("/sessions/create")
    return response.data

} 
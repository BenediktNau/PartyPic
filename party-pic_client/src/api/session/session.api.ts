import axios from "../api-client.ts"


export const createSession = async () => {
    try {
        const response = await axios.post("/sessions/create")
        return response
    } catch (error) {
        console.error('Fehler beim Upload:', error);
    }
} 
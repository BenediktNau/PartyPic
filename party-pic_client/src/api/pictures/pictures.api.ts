import axios from "../api-client.ts"


export const postPicture = async (formData: FormData) => {
    try {
        const response = await axios.post("/pictures/upload", formData
        )

        return response.data
    } catch (error) {
        console.error('Fehler beim Upload:', error);
    }
} 
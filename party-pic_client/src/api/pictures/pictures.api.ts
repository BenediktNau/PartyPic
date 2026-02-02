import axios from "../api-client.ts"

export interface InitUploadDto {
    session_id: string;
    mimetype: string; // e.g., 'image/jpeg'
}

export interface PresignedResponse {
    uploadUrl: string;
    key: string;
    bucket: string;
}

export interface Picture {
    id: string;
    u_name: string;
    session_id: string;
    original_filename: string;
    s3_key: string;
    mimetype: string;
    filesize_bytes: number;
    created_at: string;
    url?: string; // Presigned URL zum Anzeigen
}

export const initUpload = async (dto: InitUploadDto): Promise<PresignedResponse> => {
    const response = await axios.post("/pictures/init-upload", dto);
    return response.data as PresignedResponse;
};

export const uploadToPresignedUrl = async (uploadUrl: string, file: Blob, contentType: string) => {
    const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: file,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
};

export const finalizeUpload = async (payload: {
    u_name: string;
    session_id: string;
    s3_key: string;
    original_filename: string;
    filesize_bytes: number;
    mimetype: string;
}) => {
    const response = await axios.post("/pictures/finalize-upload", payload);
    return response.data;
};

// Bilder einer Session abrufen
export const getSessionPictures = async (sessionId: string): Promise<Picture[]> => {
    const response = await axios.get("/pictures/session", { params: { sessionId } });
    return response.data as Picture[];
};
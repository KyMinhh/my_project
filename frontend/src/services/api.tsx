
const baseUrl = "http://127.0.0.1:5001/api";
import { RecentFile } from '../types/fileTypes';


interface TranscribeInitiateResponse {
    success: boolean;
    message: string;
    jobId?: string;
    data?: { duration?: number | null; };
}
interface GetFilesResponse {
    success: boolean;
    data?: { files: RecentFile[]; totalPages: number; currentPage: number; totalFiles: number; };
    message?: string;
}





export const transcribeVideoFileApi = async (
    formData: FormData,
    onUploadProgress?: (progressEvent: ProgressEvent<EventTarget>) => void
): Promise<TranscribeInitiateResponse> => {


    try {
        console.log('[API] Sending POST /transcribe request with FormData...');
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}/transcribe`, {
            method: "POST",
            body: formData,
            headers
        });
        console.log(`[API] Received response status: ${response.status}`);

        if (!response.ok) {

            let errorBody;
            try { errorBody = await response.json(); } catch (e) { /* Bỏ qua lỗi parse json */ }
            console.error("API Error Response:", errorBody);
            throw new Error(errorBody?.message || `HTTP error! status: ${response.status}`);
        }

        const responseData: TranscribeInitiateResponse = await response.json();
        console.log("[API] Received data:", responseData);
        return responseData;

    } catch (error: any) {
        console.error("API transcribeVideoFileApi Error:", error);

        throw new Error(error.message || "Error uploading video.");
    }
};


export const transcribeFromYoutube = async (youtubeUrl: string): Promise<any> => {
    try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}/transcribe-from-youtube`, {
            method: "POST",
            headers,
            body: JSON.stringify({ youtubeUrl }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || "Error processing URL.");
    }
};


export const findTimestamp = async (text: string, videoPath: string): Promise<any> => {
    try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}/find-timestamp`, {
            method: "POST",
            headers,
            body: JSON.stringify({ text, videoPath }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || "Error finding timestamp.");
    }
};


export const extractVideoSegment = async (startTime: number, endTime: number, videoPath: string): Promise<any> => {
    try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}/extract-video`, {
            method: "POST",
            headers,
            body: JSON.stringify({ startTime, endTime, videoPath }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || "Error extracting video.");
    }
};
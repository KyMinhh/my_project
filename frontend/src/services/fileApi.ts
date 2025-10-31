import axios, { AxiosProgressEvent, AxiosResponse } from 'axios';



import {
    RecentFile,
    GetFilesResponse,
    GetJobDetailsResponse,
    TranscribeInitiateResponse,
    SimpleSuccessResponse,
    ExtractMultipleSegmentsResponse,
    SegmentTime,
    TranslateJobRequest,
    TranslateJobResponse

} from '../types/fileTypes';



const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true // Để gửi cookies
});

// Thêm interceptor để tự động thêm token vào headers
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


export const transcribeVideoFileApi = async (
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<TranscribeInitiateResponse> => {
    try {
        console.log('[API] Sending POST /transcribe request with FormData...');
        const response: AxiosResponse<TranscribeInitiateResponse> = await apiClient.post(
            '/transcribe',
            formData,
            {
                headers: {

                },
                onUploadProgress: onUploadProgress,
            }
        );
        console.log('[API] Received response from /transcribe:', response.data);
        return response.data;

    } catch (error: any) {
        console.error("API Transcribe File Error:", error);
        const errorData: TranscribeInitiateResponse = error.response?.data || {
            success: false,
            message: error.message || 'Unknown error during transcription request'
        };

        return errorData;
    }
};

export const getRecentFilesApi = async (page: number = 1, limit: number = 10, search: string = ''): Promise<GetFilesResponse> => {
    console.log(`[API] Fetching files: page=${page}, limit=${limit}, search='${search}'`);
    try {
        const params: { page: number; limit: number; search?: string } = { page, limit };
        if (search && search.trim()) {
            params.search = search.trim();
        }
        const response = await apiClient.get<GetFilesResponse>('/files', { params });
        console.log("[API] Received files response:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Get Recent Files Error:", error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error fetching files' };
        return { success: false, message: errorData.message };
    }
};

export const getJobDetailsApi = async (jobId: string): Promise<GetJobDetailsResponse> => {
    console.log(`[API] Fetching details for job ID: ${jobId}`);
    if (!jobId) return { success: false, message: "Job ID is required." };
    try {
        const response = await apiClient.get<GetJobDetailsResponse>(`/files/${jobId}`);
        console.log("[API] Received job details response:", response.data);
        return response.data;
    } catch (error: any) {
        console.error(`API Get Job Details Error (ID: ${jobId}):`, error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error fetching job details' };
        return { success: false, message: errorData.message };
    }
};

interface TranscribeYoutubePayload {
    youtubeUrl: string;
    languageCode?: string;
    enableSpeakerDiarization?: boolean;
}
export const transcribeYoutubeUrlApi = async (payload: TranscribeYoutubePayload): Promise<TranscribeInitiateResponse> => {
    try {
        console.log("[API] Sending POST /transcribe-from-youtube with payload:", payload);
        const response = await apiClient.post<TranscribeInitiateResponse>('/transcribe-from-youtube', payload);
        console.log("[API] Received response from /transcribe-from-youtube:", response.data);

        return response.data;
    } catch (error: any) {
        console.error("API Transcribe YouTube Error:", error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error processing YouTube URL' };
        return { success: false, message: errorData.message };
    }
};

export const deleteFileApi = async (jobId: string): Promise<SimpleSuccessResponse> => {
    if (!jobId) {
        console.error("[API] Delete failed: Job ID is required.");
        return { success: false, message: 'Job ID is required for deletion.' };
    }
    try {
        console.log(`[API] Sending DELETE /files/${jobId}`);

        const response = await apiClient.delete<SimpleSuccessResponse>(`/files/${jobId}`);
        console.log("[API] Delete response:", response.data);

        return response.data;
    } catch (error: any) {
        console.error(`API Delete Job Error (ID: ${jobId}):`, error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error deleting job' };
        return { success: false, message: errorData.message };
    }
};

export const renameJobApi = async (jobId: string, newName: string): Promise<GetJobDetailsResponse> => {
    if (!jobId) {
        console.error("[API] Rename failed: Job ID is required.");
        return { success: false, message: 'Job ID is required for renaming.' };
    }
    if (!newName || !newName.trim()) {
        console.error("[API] Rename failed: New name is required.");
        return { success: false, message: 'New name cannot be empty.' };
    }
    try {
        const trimmedName = newName.trim();
        console.log(`[API] Sending PUT /files/${jobId}/rename with name: ${trimmedName}`);

        const response = await apiClient.put<GetJobDetailsResponse>(`/files/${jobId}/rename`, { newName: trimmedName });
        console.log("[API] Rename response:", response.data);

        return response.data;
    } catch (error: any) {
        console.error(`API Rename Job Error (ID: ${jobId}):`, error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error renaming job' };
        return { success: false, message: errorData.message };
    }
};

export const retryJobApi = async (jobId: string): Promise<SimpleSuccessResponse> => {
    if (!jobId) {
        console.error("[API] Retry failed: Job ID is required.");
        return { success: false, message: 'Job ID is required for retry.' };
    }
    try {
        console.log(`[API] Sending POST /files/${jobId}/retry`);

        const response = await apiClient.post<SimpleSuccessResponse>(`/files/${jobId}/retry`);
        console.log("[API] Retry response:", response.data);

        return response.data;
    } catch (error: any) {
        console.error(`API Retry Job Error (ID: ${jobId}):`, error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error retrying job' };
        return { success: false, message: errorData.message };
    }
};

interface TranscribeTiktokPayload {
    tiktokUrl: string;
    languageCode?: string;
    enableSpeakerDiarization?: boolean;
}

export const transcribeTiktokUrlApi = async (payload: TranscribeTiktokPayload): Promise<TranscribeInitiateResponse> => {
    try {
        console.log("[API] Sending POST /transcribe-from-tiktok with payload:", payload);
        const response = await apiClient.post<TranscribeInitiateResponse>('/transcribe-from-tiktok', payload);
        console.log("[API] Received response from /transcribe-from-tiktok:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Transcribe TikTok Error:", error);
        const errorData = error.response?.data || { success: false, message: error.message || 'Unknown error processing TikTok URL' };
        return { success: false, message: errorData.message };
    }
};

export const getJobDetails = async (jobId: string): Promise<RecentFile> => {
    const response = await apiClient.get<RecentFile>(`/api/files/details/${jobId}`); // Endpoint này cần trả về đầy đủ JobFile
    return response.data;
};


export const extractMultipleVideoSegmentsApi = async (
    videoFileName: string,
    segments: SegmentTime[]
): Promise<ExtractMultipleSegmentsResponse> => {
    if (!videoFileName || !segments || segments.length === 0) {
        return { success: false, message: "Video file name and segments are required." };
    }
    try {
        const payload = { videoFileName, segments };
        console.log('[API] Sending POST /editor/extract-multiple-segments with payload:', payload);
        const response = await apiClient.post<ExtractMultipleSegmentsResponse>('/editor/extract-multiple-segments', payload);
        console.log("[API] Received response from /editor/extract-multiple-segments:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Extract Multiple Segments Error:", error);
        const errorData: ExtractMultipleSegmentsResponse = error.response?.data || {
            success: false,
            message: error.message || 'Unknown error extracting multiple segments'
        };
        return errorData;
    }
};

// Extract multiple video segments by jobId (NEW)
export const extractMultipleVideoSegmentsByJobIdApi = async (
    jobId: string,
    segments: SegmentTime[]
): Promise<ExtractMultipleSegmentsResponse> => {
    if (!jobId || !segments || segments.length === 0) {
        return { success: false, message: "Job ID and segments are required." };
    }
    try {
        const payload = { jobId, segments };
        console.log('[API] Sending POST /editor/extract-multiple-segments with jobId payload:', payload);
        const response = await apiClient.post<ExtractMultipleSegmentsResponse>('/editor/extract-multiple-segments', payload);
        console.log("[API] Received response from /editor/extract-multiple-segments:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Extract Multiple Segments By JobId Error:", error);
        const errorData: ExtractMultipleSegmentsResponse = error.response?.data || {
            success: false,
            message: error.message || 'Unknown error extracting multiple segments by jobId'
        };
        return errorData;
    }
};

// Extract single video segment by jobId and time range
export const extractSingleVideoSegmentApi = async (
    jobId: string,
    startTime: number,
    endTime: number
): Promise<ExtractMultipleSegmentsResponse> => {
    if (!jobId || startTime === undefined || endTime === undefined) {
        return { success: false, message: "Job ID, start time, and end time are required." };
    }
    try {
        const payload = { jobId, startTime, endTime };
        console.log('[API] Sending POST /editor/extract-video with payload:', payload);
        const response = await apiClient.post<ExtractMultipleSegmentsResponse>('/editor/extract-video', payload);
        console.log("[API] Received response from /editor/extract-video:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Extract Single Video Segment Error:", error);
        const errorData: ExtractMultipleSegmentsResponse = error.response?.data || {
            success: false,
            message: error.message || 'Unknown error extracting video segment'
        };
        return errorData;
    }
};

// Translate job API
export const translateJobApi = async (
    jobId: string,
    targetLang: string
): Promise<TranslateJobResponse> => {
    if (!jobId || !targetLang) {
        return { success: false, message: "Job ID and target language are required." };
    }
    try {
        const payload: TranslateJobRequest = { targetLang };
        console.log(`[API] Sending POST /files/${jobId}/translate with payload:`, payload);
        const response = await apiClient.post<TranslateJobResponse>(`/files/${jobId}/translate`, payload);
        console.log("[API] Received response from translate:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("API Translate Job Error:", error);
        const errorData: TranslateJobResponse = error.response?.data || {
            success: false,
            message: error.message || 'Unknown error translating job'
        };
        return errorData;
    }
};


import axios, { AxiosProgressEvent } from 'axios';
import { TranscriptionResponse, ApiErrorResponse } from '../types';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});


export const transcribeVideoFileApi = async (
  formData: FormData, 
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void
): Promise<TranscriptionResponse> => {
  
  try {
    const response = await apiClient.post<TranscriptionResponse>('/transcribe', formData, {
      headers: {
        
      },
      onUploadProgress: onUploadProgress,
    });
    return response.data;
  } catch (error: any) {
    console.error("API Transcribe File Error:", error);
    const errorData: ApiErrorResponse = error.response?.data || { success: false, message: error.message || 'Unknown error occurred' };
    throw new Error(errorData.message);
  }
};


export const transcribeYoutubeUrlApi = async (
    youtubeUrl: string,
    language: string 
    ): Promise<TranscriptionResponse> => {
  try {
    
    const response = await apiClient.post<TranscriptionResponse>('/transcribe-from-youtube', { youtubeUrl, language });
    return response.data;
  } catch (error: any) {
    console.error("API Transcribe YouTube Error:", error);
    const errorData: ApiErrorResponse = error.response?.data || { success: false, message: error.message || 'Unknown error occurred' };
    throw new Error(errorData.message);
  }
};



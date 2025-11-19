import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface Clip {
  _id: string;
  jobId: string;
  userId: string;
  title: string;
  description?: string;
  viralScore: number;
  emotionalPeak: 'funny' | 'inspiring' | 'shocking' | 'educational' | 'dramatic' | 'controversial' | 'heartwarming' | 'motivational' | 'informative' | 'entertaining' | 'emotional' | 'other';
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  analysis: {
    hookStrength: number;
    storyArc: 'complete' | 'cliffhanger' | 'teaser' | 'insight';
    quotableMoment: string;
    viralElements: string[];
    aiModel: string;
    analyzedAt: Date;
  };
  subtitles: Array<{
    language: string;
    text: string;
    style: any;
  }>;
  suggestedPlatforms: string[];
  hashtags: string[];
  status: 'pending' | 'processing' | 'ready' | 'failed';
  videoPath?: string;
  videoUrl?: string;
  thumbnailPath?: string;
  processingError?: string;
  processedAt?: Date;
  views: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateClipsRequest {
  maxClips?: number;
  minDuration?: number;
  maxDuration?: number;
  languages?: string[];
}

export interface GenerateClipsResponse {
  success: boolean;
  message: string;
  data: {
    clips: Clip[];
    analysisModel: string;
    processingTime: number;
    note: string;
  };
}

export interface GetClipsResponse {
  success: boolean;
  data: {
    clips: Clip[];
    total: number;
    statusCounts: {
      pending: number;
      processing: number;
      ready: number;
      failed: number;
    };
  };
}

export interface ClipResponse {
  success: boolean;
  data: Clip;
  message?: string;
}

/**
 * Generate smart viral clips from a transcribed video
 */
export const generateSmartClips = async (
  jobId: string,
  options: GenerateClipsRequest = {}
): Promise<GenerateClipsResponse> => {
  try {
    const response = await apiClient.post<GenerateClipsResponse>(
      `/clips/generate/${jobId}`,
      options
    );
    return response.data;
  } catch (error: any) {
    console.error('Generate clips error:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate clips');
  }
};

/**
 * Get all clips for a job
 */
export const getClipsByJob = async (jobId: string): Promise<GetClipsResponse> => {
  try {
    const response = await apiClient.get<GetClipsResponse>(`/clips/${jobId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get clips error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get clips');
  }
};

/**
 * Get single clip details
 */
export const getClipById = async (clipId: string): Promise<ClipResponse> => {
  try {
    const response = await apiClient.get<ClipResponse>(`/clips/single/${clipId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get clip error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get clip');
  }
};

/**
 * Update clip metadata
 */
export const updateClip = async (
  clipId: string,
  updates: Partial<Pick<Clip, 'title' | 'description' | 'hashtags' | 'suggestedPlatforms' | 'isPublished'>>
): Promise<ClipResponse> => {
  try {
    const response = await apiClient.put<ClipResponse>(`/clips/${clipId}`, updates);
    return response.data;
  } catch (error: any) {
    console.error('Update clip error:', error);
    throw new Error(error.response?.data?.message || 'Failed to update clip');
  }
};

/**
 * Delete clip (soft delete)
 */
export const deleteClip = async (clipId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.delete(`/clips/${clipId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete clip error:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete clip');
  }
};

/**
 * Regenerate clip video
 */
export const regenerateClipVideo = async (
  clipId: string,
  languages: string[] = ['vi', 'en']
): Promise<{ success: boolean; message: string; clipId: string }> => {
  try {
    const response = await apiClient.post(`/clips/${clipId}/regenerate-video`, { languages });
    return response.data;
  } catch (error: any) {
    console.error('Regenerate clip error:', error);
    throw new Error(error.response?.data?.message || 'Failed to regenerate clip');
  }
};

/**
 * Get download URL for clip
 */
export const getClipDownloadUrl = (clipId: string): string => {
  return `${API_BASE_URL}/clips/download/${clipId}`;
};

/**
 * Get video URL for clip
 */
export const getClipVideoUrl = (clipId: string): string => {
  return `${API_BASE_URL.replace('/api', '')}/clips/${clipId}/clip.mp4`;
};

/**
 * Get thumbnail URL for clip
 */
export const getClipThumbnailUrl = (clipId: string): string => {
  return `${API_BASE_URL.replace('/api', '')}/clips/${clipId}/thumbnail.jpg`;
};

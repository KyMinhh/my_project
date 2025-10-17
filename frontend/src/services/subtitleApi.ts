import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

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

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface GenerateSubtitlesRequest {
  segments: SubtitleSegment[];
  format?: 'srt' | 'vtt';
  language?: string;
}

export interface GenerateSubtitlesResponse {
  success: boolean;
  subtitlePath: string;
  format: string;
  language: string;
}

export interface MultiLanguageTranscripts {
  [language: string]: SubtitleSegment[];
}

export interface GenerateMultiLanguageResponse {
  success: boolean;
  jobId: string;
  subtitles: {
    [language: string]: {
      srt: string;
      vtt: string;
    };
  };
}

export interface BurnSubtitlesRequest {
  videoPath: string;
  subtitlePath: string;
  options?: {
    fontName?: string;
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    position?: string;
    marginV?: number;
    borderStyle?: number;
    outline?: number;
    shadow?: number;
  };
}

export interface BurnSubtitlesResponse {
  success: boolean;
  videoPath: string;
  fileSize: number;
}

export interface EmbedSubtitlesRequest {
  videoPath: string;
  subtitles: {
    [language: string]: string;
  };
  defaultLanguage?: string;
}

export interface EmbedSubtitlesResponse {
  success: boolean;
  videoPath: string;
  fileSize: number;
  languages: string[];
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

export interface BurnSubtitlesDirectRequest {
  videoPath: string;
  segments: SubtitleSegment[];
  language?: string;
  format?: 'srt' | 'vtt';
  options?: {
    fontName?: string;
    fontSize?: number;
    primaryColor?: string;
    outlineColor?: string;
    backColor?: string;
    bold?: number;
    italic?: number;
    borderStyle?: number;
    outline?: number;
    shadow?: number;
    alignment?: number;
    marginV?: number;
    marginL?: number;
    marginR?: number;
  };
}

export interface BurnSubtitlesDirectResponse {
  success: boolean;
  videoPath: string;
  subtitlePath: string;
  fileSize: number;
  language: string;
}

export const subtitleApi = {
  async generateSubtitles(data: GenerateSubtitlesRequest): Promise<GenerateSubtitlesResponse> {
    const response = await apiClient.post('/subtitles/generate', data);
    return response.data;
  },

  async generateMultiLanguageSubtitles(
    transcripts: MultiLanguageTranscripts
  ): Promise<GenerateMultiLanguageResponse> {
    const response = await apiClient.post('/subtitles/generate-multi', { transcripts });
    return response.data;
  },

  async burnSubtitles(data: BurnSubtitlesRequest): Promise<BurnSubtitlesResponse> {
    const response = await apiClient.post('/subtitles/burn', data);
    return response.data;
  },

  async burnSubtitlesDirect(data: BurnSubtitlesDirectRequest): Promise<BurnSubtitlesDirectResponse> {
    const response = await apiClient.post('/subtitles/burn-direct', data);
    return response.data;
  },

  async embedSubtitles(data: EmbedSubtitlesRequest): Promise<EmbedSubtitlesResponse> {
    const response = await apiClient.post('/subtitles/embed', data);
    return response.data;
  },

  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    const response = await apiClient.get('/subtitles/video-info', {
      params: { videoPath },
    });
    return response.data.info;
  },

  async downloadSubtitle(subtitlePath: string): Promise<Blob> {
    const response = await apiClient.get('/subtitles/download', {
      params: { subtitlePath },
      responseType: 'blob',
    });
    return response.data;
  },
};

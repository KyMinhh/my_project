import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface SummaryData {
    text: string;
    generatedAt: string;
    model: string;
    provider: string;
}

export interface SummaryResult {
    type: string;
    summary: string;
    model: string;
    provider: string;
    processingTime?: number;
    tokenCount?: number;
    fallbackUsed?: boolean;
    generatedAt: string;
}

export interface ServicesStatus {
    gemini: {
        name: string;
        model: string;
        available: boolean;
        features: string[];
        costPer1MTokens: { input: number; output: number };
    };
    openai: {
        name: string;
        model: string;
        available: boolean;
        features: string[];
        costPer1MTokens: { input: number; output: number };
    };
    strategy: {
        primary: string;
        fallback: string;
    };
}

/**
 * Get AI services status
 */
export const getServicesStatus = async (): Promise<ServicesStatus> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/summary/services-status`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
};

/**
 * Estimate cost for summary generation
 */
export const estimateSummaryCost = async (transcriptLength: number, type: string = 'detailed') => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
        `${API_BASE_URL}/api/summary/estimate-cost`,
        { transcriptLength, type },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
};

/**
 * Generate summary for a specific job
 */
export const generateSummary = async (
    jobId: string,
    type: string = 'detailed',
    forceRegenerate: boolean = false
): Promise<{
    success: boolean;
    cached: boolean;
    message: string;
    data: SummaryResult;
}> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
        `${API_BASE_URL}/api/summary/generate/${jobId}`,
        { type, forceRegenerate },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

/**
 * Generate multiple summary types at once
 */
export const generateMultipleSummaries = async (
    jobId: string,
    types: string[] = ['quick', 'detailed'],
    forceRegenerate: boolean = false
) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
        `${API_BASE_URL}/api/summary/generate-multiple/${jobId}`,
        { types, forceRegenerate },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

/**
 * Get all summaries for a job
 */
export const getSummaries = async (jobId: string): Promise<Record<string, SummaryData>> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/summary/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
};

/**
 * Delete a specific summary
 */
export const deleteSummary = async (jobId: string, type: string) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.delete(`${API_BASE_URL}/api/summary/${jobId}/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

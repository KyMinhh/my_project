import { useEffect, useState, useCallback } from 'react';
import transcriptionSocket, { JobStatusUpdate } from '../services/transcriptionSocket';

interface UseJobStatusOptions {
    jobId?: string;
    onStatusChange?: (update: JobStatusUpdate) => void;
}

interface JobStatusState {
    status: JobStatusUpdate['status'] | null;
    message: string;
    progress: number | null;
    transcription: string | null;
    segments: any[] | null;
    isProcessing: boolean;
    isSuccess: boolean;
    isFailed: boolean;
    processingTime: string | null;
    error: string | null;
}

/**
 * Hook to track job status updates via Socket.IO
 * @param options - Configuration options
 * @returns Current job state and update handler
 */
export function useJobStatus({ jobId, onStatusChange }: UseJobStatusOptions = {}) {
    const [jobState, setJobState] = useState<JobStatusState>({
        status: null,
        message: '',
        progress: null,
        transcription: null,
        segments: null,
        isProcessing: false,
        isSuccess: false,
        isFailed: false,
        processingTime: null,
        error: null,
    });

    const handleJobUpdate = useCallback((update: JobStatusUpdate) => {
        console.log('📊 Job status update:', update);

        const isProcessing = ['uploading', 'extracting', 'uploading_cloud', 'creating_job', 'queued', 'processing', 'translating'].includes(update.status);
        const isSuccess = ['success', 'translation_complete'].includes(update.status);
        const isFailed = ['failed', 'translation_failed'].includes(update.status);

        setJobState({
            status: update.status,
            message: update.message,
            progress: update.progress || null,
            transcription: update.transcription || null,
            segments: update.segments || null,
            isProcessing,
            isSuccess,
            isFailed: update.status === 'failed',
            processingTime: update.processingTime || null,
            error: isFailed ? update.message : null,
        });

        // Call custom callback if provided
        if (onStatusChange) {
            onStatusChange(update);
        }
    }, [onStatusChange]);

    useEffect(() => {
        if (!transcriptionSocket.isConnected()) {
            console.warn('⚠️ Transcription socket not connected yet');
        }

        let unsubscribe: (() => void) | null = null;

        if (jobId) {
            // Subscribe to specific job
            unsubscribe = transcriptionSocket.subscribeToJob(jobId, handleJobUpdate);
        } else {
            // Subscribe to all jobs (useful for dashboard)
            unsubscribe = transcriptionSocket.subscribeToAll(handleJobUpdate);
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [jobId, handleJobUpdate]);

    return jobState;
}

/**
 * Hook to track multiple jobs
 */
export function useMultipleJobStatus(jobIds: string[]) {
    const [jobsState, setJobsState] = useState<Map<string, JobStatusState>>(new Map());

    const handleJobUpdate = useCallback((update: JobStatusUpdate) => {
        if (jobIds.includes(update.jobId)) {
            setJobsState(prev => {
                const newMap = new Map(prev);
                const isProcessing = ['uploading', 'extracting', 'uploading_cloud', 'creating_job', 'queued', 'processing', 'translating'].includes(update.status);
                const isSuccess = ['success', 'translation_complete'].includes(update.status);
                const isFailed = update.status === 'failed';

                newMap.set(update.jobId, {
                    status: update.status,
                    message: update.message,
                    progress: update.progress || null,
                    transcription: update.transcription || null,
                    segments: update.segments || null,
                    isProcessing,
                    isSuccess,
                    isFailed,
                    processingTime: update.processingTime || null,
                    error: isFailed ? update.message : null,
                });

                return newMap;
            });
        }
    }, [jobIds]);

    useEffect(() => {
        const unsubscribe = transcriptionSocket.subscribeToAll(handleJobUpdate);

        return () => {
            unsubscribe();
        };
    }, [handleJobUpdate]);

    return jobsState;
}

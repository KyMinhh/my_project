import { io, Socket } from 'socket.io-client';

export interface JobStatusUpdate {
    jobId: string;
    status: 'uploading' | 'extracting' | 'uploading_cloud' | 'creating_job' | 'queued' | 'processing' | 'success' | 'translating' | 'translation_complete' | 'translation_failed' | 'failed';
    message: string;
    timestamp?: string;
    progress?: number;
    transcription?: string;
    segments?: any[];
    translatedTranscript?: any[];
    detectedSpeakerCount?: number;
    processingTime?: string;
}

type JobStatusCallback = (update: JobStatusUpdate) => void;

class TranscriptionSocketService {
    private socket: Socket | null = null;
    private callbacks: Map<string, JobStatusCallback[]> = new Map();
    private globalCallbacks: JobStatusCallback[] = [];

    constructor() {
        this.connect();
    }

    private connect(): void {
        if (this.socket?.connected) {
            return;
        }

        const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
        
        this.socket = io(serverUrl, {
            auth: {
                token: localStorage.getItem('authToken')
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to transcription socket server');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from transcription socket server');
        });

        // Listen for job status updates
        this.socket.on('jobStatusUpdate', (data: JobStatusUpdate) => {
            console.log(`📢 Job update received:`, data);
            
            // Call global callbacks
            this.globalCallbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in global callback:', error);
                }
            });

            // Call job-specific callbacks
            const jobCallbacks = this.callbacks.get(data.jobId);
            if (jobCallbacks) {
                jobCallbacks.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in callback for job ${data.jobId}:`, error);
                    }
                });
            }
        });

        this.socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });
    }

    /**
     * Subscribe to updates for a specific job
     */
    public subscribeToJob(jobId: string, callback: JobStatusCallback): () => void {
        if (!this.callbacks.has(jobId)) {
            this.callbacks.set(jobId, []);
        }
        
        this.callbacks.get(jobId)!.push(callback);
        console.log(`🔔 Subscribed to job ${jobId}`);

        // Return unsubscribe function
        return () => {
            const callbacks = this.callbacks.get(jobId);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
                
                // Clean up empty arrays
                if (callbacks.length === 0) {
                    this.callbacks.delete(jobId);
                }
            }
            console.log(`🔕 Unsubscribed from job ${jobId}`);
        };
    }

    /**
     * Subscribe to all job updates (global listener)
     */
    public subscribeToAll(callback: JobStatusCallback): () => void {
        this.globalCallbacks.push(callback);
        console.log(`🔔 Subscribed to all job updates`);

        // Return unsubscribe function
        return () => {
            const index = this.globalCallbacks.indexOf(callback);
            if (index > -1) {
                this.globalCallbacks.splice(index, 1);
            }
            console.log(`🔕 Unsubscribed from all job updates`);
        };
    }

    /**
     * Check if socket is connected
     */
    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Get the socket instance (for advanced usage)
     */
    public getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Disconnect the socket
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.callbacks.clear();
        this.globalCallbacks = [];
    }

    /**
     * Update authentication token
     */
    public updateAuth(token: string): void {
        if (this.socket) {
            this.socket.auth = { token };
            if (this.socket.connected) {
                this.socket.disconnect();
                this.connect();
            }
        }
    }
}

// Singleton instance
const transcriptionSocket = new TranscriptionSocketService();

export default transcriptionSocket;
export { TranscriptionSocketService };

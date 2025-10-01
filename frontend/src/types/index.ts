export interface Segment {
    id: number | string; 
    start: number;      
    end: number;        
    text: string;       
}


export interface TranscriptionResponse {
    success: boolean;
    message?: string;
    videoId?: string;        
    sourceUrl?: string;      
    full_text?: string;    
    segments?: Segment[];    
}

export interface ApiErrorResponse {
    success: boolean;
    message: string;
    details?: string;
}

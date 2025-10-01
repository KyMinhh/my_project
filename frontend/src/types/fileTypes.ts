export type JobStatus = 'waiting' | 'processing' | 'success' | 'failed';

export interface RecentFile {
    _id?: string;
    id?: string | number;
    fileName: string;
    originalName?: string;
    status: JobStatus;
    fileSize: number | null;
    duration: number | null;
    createTime?: string;
    createdAt?: string;
    updatedAt?: string;

    transcriptionResult?: string | null | undefined;
    segments?: Segment[];
    errorMessage?: string;
    languageCode?: string;
    speakerDiarizationEnabled?: boolean;
    gcsAudioUri?: string;
    videoUrl?: string | null;

    detectedSpeakerCount?: number;     // <-- THÊM MỚI/ĐẢM BẢO CÓ
}


export interface JobDetail extends RecentFile {
    videoFileName: any;
}


export interface TranscribeInitiateResponse {
    success: boolean;
    message: string;
    jobId?: string;
    data?: { duration?: number | null; };
}


export interface GetFilesResponse {
    success: boolean;
    data?: {
        files: RecentFile[];
        totalPages: number;
        currentPage: number;
        totalFiles: number;
    };
    message?: string;
}


export interface GetJobDetailsResponse {
    success: boolean;
    data?: JobDetail;
    message?: string;
}

export interface Segment {
    start: number;
    end: number;
    text: string;
    speakerTag?: number;
}

export interface SimpleSuccessResponse {
    success: boolean;
    message?: string;

}

export interface SegmentTime { // Dùng để gửi lên backend
    startTime: number;
    endTime: number;
}

export interface ExtractedClipInfo { // Thông tin clip trả về từ backend
    name: string;  // Tên file để hiển thị
    url: string;   // URL đầy đủ để tải hoặc xem trước
}

export interface ExtractMultipleSegmentsResponse {
    success: boolean;
    message?: string;
    status?: number; // << THÊM DÒNG NÀY (có thể là number hoặc string tùy theo backend trả về)
    data?: {
        clips: string[];
    };
    // errors?: Array<{ segmentIndex: number; message: string }>; // Nếu bạn muốn báo lỗi chi tiết từng segment
}

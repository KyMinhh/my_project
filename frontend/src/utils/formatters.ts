// frontend/src/utils/formatters.ts

// Hàm định dạng kích thước file
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    // Sửa lỗi nhỏ: dùng Math.max để tránh index âm nếu bytes < 1
    const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)));
    // Xử lý trường hợp i vượt quá độ dài mảng sizes
    if (i >= sizes.length) return parseFloat((bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)) + ' ' + sizes[sizes.length - 1];
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Hàm định dạng thời gian (giây sang MM:SS hoặc H:MM:SS)
export const formatDuration = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds)) return '-'; // Thêm kiểm tra isFinite
    const value = Math.round(seconds);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
};
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class TikTokService {
    constructor() {
        this.clientKey = process.env.TIKTOK_CLIENT_KEY;
        this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        this.redirectUri = process.env.TIKTOK_REDIRECT_URI;
        this.apiUrl = process.env.TIKTOK_API_URL || 'https://open.tiktokapis.com/v2/';
    }

    /**
     * Generate OAuth authorization URL
     * User will visit this URL to authorize the app
     */
    getAuthorizationUrl(state) {
        const scope = 'user.info.basic,video.upload,video.publish';
        
        const params = new URLSearchParams({
            client_key: this.clientKey,
            scope: scope,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            state: state || Math.random().toString(36).substring(7)
        });

        return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async getAccessToken(code) {
        try {
            const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
                client_key: this.clientKey,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in,
                open_id: response.data.open_id
            };
        } catch (error) {
            console.error('[TikTok] Get access token error:', error.response?.data || error.message);
            throw new Error('Failed to get TikTok access token: ' + (error.response?.data?.message || error.message));
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
                client_key: this.clientKey,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            });

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in
            };
        } catch (error) {
            console.error('[TikTok] Refresh token error:', error.response?.data || error.message);
            throw new Error('Failed to refresh TikTok token');
        }
    }

    /**
     * Get user info
     */
    async getUserInfo(accessToken) {
        try {
            const response = await axios.get(`${this.apiUrl}user/info/`, {
                params: {
                    fields: 'open_id,union_id,avatar_url,display_name'
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.data.user;
        } catch (error) {
            console.error('[TikTok] Get user info error:', error.response?.data || error.message);
            throw new Error('Failed to get TikTok user info');
        }
    }

    /**
     * Initialize video upload
     * Step 1 of upload process
     */
    async initializeUpload(accessToken, videoInfo) {
        try {
            console.log('[TikTok] Initializing video upload...');
            
            const response = await axios.post(
                `${this.apiUrl}post/publish/inbox/video/init/`,
                {
                    post_info: {
                        title: videoInfo.title,
                        privacy_level: videoInfo.privacyLevel || 'SELF_ONLY', // Can be: SELF_ONLY, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, PUBLIC_TO_EVERYONE
                        disable_duet: videoInfo.disableDuet || false,
                        disable_comment: videoInfo.disableComment || false,
                        disable_stitch: videoInfo.disableStitch || false,
                        video_cover_timestamp_ms: videoInfo.coverTimestamp || 1000
                    },
                    source_info: {
                        source: 'FILE_UPLOAD',
                        video_size: videoInfo.videoSize,
                        chunk_size: videoInfo.chunkSize || videoInfo.videoSize,
                        total_chunk_count: 1
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=UTF-8'
                    }
                }
            );

            console.log('[TikTok] Upload initialized:', response.data);
            
            return {
                publish_id: response.data.data.publish_id,
                upload_url: response.data.data.upload_url
            };
        } catch (error) {
            console.error('[TikTok] Initialize upload error:', error.response?.data || error.message);
            throw new Error('Failed to initialize TikTok upload: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    /**
     * Upload video file to TikTok
     * Step 2 of upload process
     */
    async uploadVideo(uploadUrl, videoPath) {
        try {
            console.log('[TikTok] Uploading video file...');
            
            const videoBuffer = fs.readFileSync(videoPath);
            
            const response = await axios.put(uploadUrl, videoBuffer, {
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Length': videoBuffer.length
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            console.log('[TikTok] Video uploaded successfully');
            return response.data;
        } catch (error) {
            console.error('[TikTok] Upload video error:', error.message);
            throw new Error('Failed to upload video to TikTok: ' + error.message);
        }
    }

    /**
     * Publish video (complete the upload)
     * Step 3 of upload process
     */
    async publishVideo(accessToken, publishId) {
        try {
            console.log('[TikTok] Publishing video...');
            
            const response = await axios.post(
                `${this.apiUrl}post/publish/status/fetch/`,
                {
                    publish_id: publishId
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=UTF-8'
                    }
                }
            );

            console.log('[TikTok] Publish status:', response.data);
            
            return {
                status: response.data.data.status,
                fail_reason: response.data.data.fail_reason
            };
        } catch (error) {
            console.error('[TikTok] Publish video error:', error.response?.data || error.message);
            throw new Error('Failed to publish video to TikTok');
        }
    }

    /**
     * Complete auto-post workflow
     * All-in-one function
     */
    async autoPostClip(accessToken, clipPath, clipData) {
        try {
            console.log('[TikTok Auto-Post] Starting workflow for:', clipData.title);

            // Get video file size
            const stats = fs.statSync(clipPath);
            const videoSize = stats.size;

            // Step 1: Initialize upload
            const { publish_id, upload_url } = await this.initializeUpload(accessToken, {
                title: clipData.title,
                privacyLevel: clipData.privacyLevel || 'PUBLIC_TO_EVERYONE',
                disableDuet: clipData.disableDuet || false,
                disableComment: clipData.disableComment || false,
                videoSize: videoSize
            });

            // Step 2: Upload video
            await this.uploadVideo(upload_url, clipPath);

            // Step 3: Wait a bit for processing
            await this.sleep(5000);

            // Step 4: Check publish status
            const status = await this.publishVideo(accessToken, publish_id);

            console.log('[TikTok Auto-Post] ✅ Completed!');

            return {
                success: true,
                publish_id: publish_id,
                status: status.status,
                message: 'Video uploaded to TikTok successfully'
            };

        } catch (error) {
            console.error('[TikTok Auto-Post] ❌ Failed:', error.message);
            throw error;
        }
    }

    /**
     * Get video list
     */
    async getVideoList(accessToken, cursor = 0, maxCount = 20) {
        try {
            const response = await axios.post(
                `${this.apiUrl}post/publish/video/list/`,
                {
                    max_count: maxCount,
                    cursor: cursor
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=UTF-8'
                    }
                }
            );

            return {
                videos: response.data.data.videos,
                cursor: response.data.data.cursor,
                has_more: response.data.data.has_more
            };
        } catch (error) {
            console.error('[TikTok] Get video list error:', error.response?.data || error.message);
            throw new Error('Failed to get TikTok video list');
        }
    }

    /**
     * Helper: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if service is configured
     */
    isConfigured() {
        return !!(this.clientKey && this.clientSecret && this.redirectUri);
    }
}

module.exports = new TikTokService();

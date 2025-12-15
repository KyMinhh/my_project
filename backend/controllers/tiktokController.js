const tiktokService = require('../services/tiktokService');
const TikTokAccount = require('../schemas/TikTokAccount');
const Clip = require('../schemas/Clip');
const path = require('path');

/**
 * GET /api/tiktok/auth-url
 * Get TikTok authorization URL
 */
exports.getAuthUrl = async (req, res) => {
    try {
        if (!tiktokService.isConfigured()) {
            return res.status(500).json({
                success: false,
                message: 'TikTok API not configured. Please check .env file.'
            });
        }

        const userId = req.user.id;
        const state = `user_${userId}_${Date.now()}`;

        const authUrl = tiktokService.getAuthorizationUrl(state);

        res.json({
            success: true,
            authUrl: authUrl,
            message: 'Visit this URL to authorize TikTok'
        });

    } catch (error) {
        console.error('[TikTok Controller] Get auth URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate auth URL',
            error: error.message
        });
    }
};

/**
 * GET /api/tiktok/callback
 * OAuth callback endpoint
 */
exports.handleCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`${process.env.CLIENT_URL}/settings?tiktok_error=${error}`);
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code missing'
            });
        }

        // Extract userId from state
        const userIdMatch = state.match(/user_(\w+)_/);
        if (!userIdMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid state parameter'
            });
        }
        const userId = userIdMatch[1];

        console.log('[TikTok] Processing callback for user:', userId);

        // Exchange code for access token
        const tokenData = await tiktokService.getAccessToken(code);

        // Get user info
        const userInfo = await tiktokService.getUserInfo(tokenData.access_token);

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        // Save or update TikTok account
        await TikTokAccount.findOneAndUpdate(
            { userId: userId },
            {
                userId: userId,
                openId: tokenData.open_id,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: expiresAt,
                displayName: userInfo.display_name,
                avatarUrl: userInfo.avatar_url,
                isActive: true,
                lastUsed: new Date()
            },
            { upsert: true, new: true }
        );

        console.log('[TikTok] ✅ Account connected successfully');

        // Redirect back to frontend with success
        res.redirect(`${process.env.CLIENT_URL}/settings?tiktok_connected=true`);

    } catch (error) {
        console.error('[TikTok Controller] Callback error:', error);
        res.redirect(`${process.env.CLIENT_URL}/settings?tiktok_error=${encodeURIComponent(error.message)}`);
    }
};

/**
 * GET /api/tiktok/account
 * Get connected TikTok account info
 */
exports.getAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        const account = await TikTokAccount.findOne({ userId: userId, isActive: true });

        if (!account) {
            return res.json({
                success: true,
                connected: false,
                message: 'No TikTok account connected'
            });
        }

        // Check if token needs refresh
        if (account.needsRefresh()) {
            console.log('[TikTok] Token needs refresh');
            try {
                const newTokenData = await tiktokService.refreshAccessToken(account.refreshToken);
                
                account.accessToken = newTokenData.access_token;
                account.refreshToken = newTokenData.refresh_token;
                account.expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));
                await account.save();
                
                console.log('[TikTok] ✅ Token refreshed');
            } catch (refreshError) {
                console.error('[TikTok] Token refresh failed:', refreshError);
                account.isActive = false;
                await account.save();
                
                return res.json({
                    success: true,
                    connected: false,
                    needsReauth: true,
                    message: 'TikTok authorization expired. Please reconnect.'
                });
            }
        }

        res.json({
            success: true,
            connected: true,
            account: {
                displayName: account.displayName,
                avatarUrl: account.avatarUrl,
                expiresAt: account.expiresAt,
                settings: account.autoPostSettings
            }
        });

    } catch (error) {
        console.error('[TikTok Controller] Get account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get TikTok account',
            error: error.message
        });
    }
};

/**
 * DELETE /api/tiktok/disconnect
 * Disconnect TikTok account
 */
exports.disconnect = async (req, res) => {
    try {
        const userId = req.user.id;

        await TikTokAccount.findOneAndUpdate(
            { userId: userId },
            { isActive: false }
        );

        res.json({
            success: true,
            message: 'TikTok account disconnected'
        });

    } catch (error) {
        console.error('[TikTok Controller] Disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect TikTok',
            error: error.message
        });
    }
};

/**
 * POST /api/tiktok/post/:clipId
 * Post clip to TikTok
 */
exports.postClip = async (req, res) => {
    try {
        const { clipId } = req.params;
        const userId = req.user.id;
        const { caption, privacyLevel } = req.body;

        console.log(`[TikTok] Posting clip ${clipId} to TikTok...`);

        // Get TikTok account
        const account = await TikTokAccount.findOne({ userId: userId, isActive: true });
        if (!account) {
            return res.status(400).json({
                success: false,
                message: 'TikTok account not connected. Please connect first.'
            });
        }

        // Refresh token if needed
        if (account.needsRefresh()) {
            const newTokenData = await tiktokService.refreshAccessToken(account.refreshToken);
            account.accessToken = newTokenData.access_token;
            account.refreshToken = newTokenData.refresh_token;
            account.expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));
            await account.save();
        }

        // Get clip
        const clip = await Clip.findById(clipId);
        if (!clip) {
            return res.status(404).json({
                success: false,
                message: 'Clip not found'
            });
        }

        if (clip.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (clip.status !== 'ready' || !clip.videoPath) {
            return res.status(400).json({
                success: false,
                message: 'Clip is not ready for posting'
            });
        }

        // Prepare caption with hashtags
        const fullCaption = caption || `${clip.title}\n\n${clip.hashtags.join(' ')}`;

        // Post to TikTok
        const result = await tiktokService.autoPostClip(
            account.accessToken,
            clip.videoPath,
            {
                title: fullCaption.substring(0, 150), // TikTok limit
                privacyLevel: privacyLevel || account.autoPostSettings.privacyLevel,
                disableDuet: account.autoPostSettings.disableDuet,
                disableComment: account.autoPostSettings.disableComment
            }
        );

        // Update account last used
        account.lastUsed = new Date();
        await account.save();

        // Update clip with TikTok post info
        clip.tiktokPostId = result.publish_id;
        clip.tiktokPostedAt = new Date();
        await clip.save();

        console.log('[TikTok] ✅ Clip posted successfully');

        res.json({
            success: true,
            message: 'Clip posted to TikTok successfully!',
            data: {
                publish_id: result.publish_id,
                status: result.status
            }
        });

    } catch (error) {
        console.error('[TikTok Controller] Post clip error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to post to TikTok',
            error: error.message
        });
    }
};

/**
 * PUT /api/tiktok/settings
 * Update auto-post settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = req.body;

        const account = await TikTokAccount.findOne({ userId: userId, isActive: true });
        if (!account) {
            return res.status(400).json({
                success: false,
                message: 'TikTok account not connected'
            });
        }

        // Update settings
        Object.keys(settings).forEach(key => {
            if (account.autoPostSettings.hasOwnProperty(key)) {
                account.autoPostSettings[key] = settings[key];
            }
        });

        await account.save();

        res.json({
            success: true,
            message: 'Settings updated',
            settings: account.autoPostSettings
        });

    } catch (error) {
        console.error('[TikTok Controller] Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

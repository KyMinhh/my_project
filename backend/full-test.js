/**
 * Login and Test Translation APIs
 * Windows-compatible test script
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Update with your credentials
const USER_CREDENTIALS = {
    email: 'vkminh04.c23xuantruong@gmail.com',
    password: '123456'
};

let authToken = '';
let testVideoId = ''; // Will be populated from recent files

async function login() {
    console.log('\n🔐 Logging in...');
    try {
        const response = await axios.post(`${API_BASE}/v1/users/login`, USER_CREDENTIALS);
        authToken = response.data.token;
        console.log('✅ Login successful!');
        console.log('Token:', authToken.substring(0, 20) + '...');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function getRecentVideos() {
    console.log('\n📹 Getting recent videos...');
    try {
        const response = await axios.get(`${API_BASE}/dashboard/recent-jobs?limit=10`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const videos = response.data;
        console.log(`✅ Found ${videos.length} videos`);

        if (videos.length > 0) {
            testVideoId = videos[0]._id;
            console.log('Using video:', videos[0].title || videos[0].filename);
            console.log('Video ID:', testVideoId);
        }

        return videos;
    } catch (error) {
        console.error('❌ Failed to get videos:', error.response?.data || error.message);
        return [];
    }
}

async function testGetVoices() {
    console.log('\n🎙️ Testing: Get Voices for Vietnamese');
    try {
        const response = await axios.get(`${API_BASE}/translation/voices/vi`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log(`✅ Found ${response.data.count} voices`);
        console.log('\nAvailable voices:');
        response.data.voices.slice(0, 5).forEach(voice => {
            console.log(`  - ${voice.name} (${voice.gender}, ${voice.quality})`);
        });

        return response.data.voices;
    } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
        return [];
    }
}

async function testDetectLanguage() {
    if (!testVideoId) {
        console.log('\n⚠️ Skipping language detection - no video available');
        return;
    }

    console.log('\n🔍 Testing: Detect Language');
    try {
        const response = await axios.post(
            `${API_BASE}/translation/detect-language`,
            { videoId: testVideoId },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log(`✅ Detected language: ${response.data.detectedLanguage}`);
        console.log('Language info:', response.data.languageInfo);
    } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
    }
}

async function testStartTranslation() {
    if (!testVideoId) {
        console.log('\n⚠️ Skipping translation - no video available');
        return;
    }

    console.log('\n🚀 Testing: Start Translation (English → Vietnamese)');
    console.log('⚠️  This will actually start a translation job!');
    console.log('Press Ctrl+C within 3 seconds to cancel...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        const response = await axios.post(
            `${API_BASE}/translation/start`,
            {
                videoId: testVideoId,
                sourceLang: 'en',
                targetLang: 'vi',
                voiceConfig: {
                    gender: 'FEMALE',
                    speakingRate: 1.0,
                    pitch: 0
                }
            },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ Translation started!');
        console.log('Job ID:', response.data.jobId);
        console.log('Status:', response.data.status);
        console.log('Estimated time:', response.data.estimatedTime, 'seconds');

        // Monitor progress
        await monitorProgress(response.data.jobId);

    } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
    }
}

async function monitorProgress(jobId) {
    console.log('\n📊 Monitoring translation progress...\n');

    const interval = setInterval(async () => {
        try {
            const response = await axios.get(`${API_BASE}/translation/status/${jobId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const { status, progress, currentStep } = response.data;

            console.log(`[${new Date().toLocaleTimeString()}] ${progress}% - ${currentStep} (${status})`);

            if (status === 'completed') {
                clearInterval(interval);
                console.log('\n✅ Translation completed!');

                // Get result
                const result = await axios.get(`${API_BASE}/translation/result/${jobId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });

                console.log('\n📥 Result:');
                console.log('Video URL:', result.data.videoUrl);
                console.log('Subtitles:', result.data.subtitles.length, 'files');
                console.log('Processing time:', result.data.processingTime, 'seconds');
            } else if (status === 'failed') {
                clearInterval(interval);
                console.error('\n❌ Translation failed!');
            }
        } catch (error) {
            clearInterval(interval);
            console.error('❌ Error monitoring:', error.message);
        }
    }, 5000); // Check every 5 seconds
}

async function testHistory() {
    console.log('\n📜 Testing: Get Translation History');
    try {
        const response = await axios.get(`${API_BASE}/translation/history?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log(`✅ Found ${response.data.total} translations in history`);

        if (response.data.stats) {
            console.log('\nStatistics:');
            console.log('  Total translations:', response.data.stats.totalTranslations);
            console.log('  Total processing time:', Math.round(response.data.stats.totalProcessingTime / 60), 'minutes');
            console.log('  Average rating:', response.data.stats.averageRating?.toFixed(1) || 'N/A');
        }

        if (response.data.history.length > 0) {
            console.log('\nLatest translations:');
            response.data.history.slice(0, 3).forEach((item, i) => {
                console.log(`  ${i + 1}. ${item.sourceLang} → ${item.targetLang}`);
                console.log(`     Video: ${item.originalVideo.title}`);
                console.log(`     Rating: ${item.userRating || 'Not rated'}`);
            });
        }
    } catch (error) {
        console.error('❌ Failed:', error.response?.data || error.message);
    }
}

async function runFullTest() {
    console.log('🧪 Full Translation API Test Suite');
    console.log('='.repeat(60));

    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without authentication');
        return;
    }

    // Step 2: Get videos
    await getRecentVideos();

    // Step 3: Test voices
    await testGetVoices();

    // Step 4: Test language detection
    await testDetectLanguage();

    // Step 5: Test history
    await testHistory();

    // Step 6: Ask user if they want to start translation
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 Ready to test actual translation?');
    console.log('This will:');
    console.log('  1. Start a translation job');
    console.log('  2. Use Google Cloud APIs (costs ~$0.42 per 10 min video)');
    console.log('  3. Take several minutes to complete');
    console.log('\nTo test translation, run:');
    console.log('  node full-test.js --translate');

    if (process.argv.includes('--translate')) {
        await testStartTranslation();
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test suite completed!');
}

// Run tests
runFullTest().catch(console.error);

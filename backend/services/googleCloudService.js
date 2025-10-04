const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const path = require('path');

// Check env vars
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
}
if (!process.env.GCS_BUCKET_NAME) {
    console.warn('GCS_BUCKET_NAME not set, using default: myspeechtt1');
}

const storage = new Storage();
const speechClient = new SpeechClient();
const translate = new Translate();

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'myspeechtt1';

async function uploadToGCS(localFilePath, destinationBlobName) {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const blobName = destinationBlobName || `audio-${Date.now()}${path.extname(localFilePath) || '.wav'}`;

        console.log(`☁️ Uploading ${localFilePath} to gs://${BUCKET_NAME}/${blobName}`);
        await bucket.upload(localFilePath, { destination: blobName, resumable: false });
        const gcsUri = `gs://${BUCKET_NAME}/${blobName}`;
        console.log(`✔️ Upload complete: ${gcsUri}`);
        return gcsUri;
    } catch (error) {
        console.error("❌ Error uploading to GCS:", error);
        throw new Error(`Failed to upload to GCS: ${error.message}`);
    }
}

function timeToSeconds(timeObj) {
    if (!timeObj) return null;

    const seconds = timeObj.seconds ? Number(timeObj.seconds) : 0;
    const nanos = timeObj.nanos ? Number(timeObj.nanos) / 1e9 : 0;
    if (isNaN(seconds) || isNaN(nanos)) {
        console.warn("Invalid time object received:", timeObj);
        return null;
    }
    return seconds + nanos;
}

async function transcribeAudioFromGCS(gcsUri, config) {
    console.log(`📝 Starting transcription for ${gcsUri} with config:`, JSON.stringify(config, null, 2));
    const request = {
        audio: { uri: gcsUri },
        config: config // config này đã bao gồm diarizationConfig từ videoController
    };

    try {
        const [operation] = await speechClient.longRunningRecognize(request);
        console.log(`⏳ Transcription operation started: ${operation.name}`);
        const [response] = await operation.promise();
        console.log(`✔️ Transcription operation finished. Raw response received.`);

        const segments = [];
        let fullTranscript = '';
        const allSpeakerTags = new Set(); // Để theo dõi số lượng người nói

        if (!response.results || response.results.length === 0) {
            console.warn("Google response contains no results.");
            return { transcription: '', segments: [], rawResponse: response, detectedSpeakerCount: 0 };
        }

        response.results.forEach((result, resultIndex) => {
            if (result.alternatives && result.alternatives[0] && result.alternatives[0].words && result.alternatives[0].words.length > 0) {
                const alternative = result.alternatives[0];

                // Logic mới để xử lý segments với speakerTag
                let currentSpeakerTag = null;
                let currentText = '';
                let currentStartTime = null;
                let currentEndTime = null;

                alternative.words.forEach((wordInfo, wordIndex) => {
                    const wordStart = timeToSeconds(wordInfo.startTime);
                    const wordEnd = timeToSeconds(wordInfo.endTime);
                    const wordText = wordInfo.word;
                    const speakerTag = wordInfo.speakerTag; // Lấy speakerTag

                    if (wordStart === null || wordEnd === null) {
                        console.warn(`[Result ${resultIndex}, Word ${wordIndex}] ('${wordText}') has invalid timestamps.`);
                        return; // Bỏ qua từ này nếu thời gian không hợp lệ
                    }

                    if (config.diarizationConfig?.enableSpeakerDiarization) {
                        allSpeakerTags.add(speakerTag); // Thêm tag vào Set để đếm số người nói duy nhất

                        if (currentSpeakerTag !== speakerTag && currentSpeakerTag !== null) {
                            // Người nói thay đổi, lưu segment cũ (nếu có)
                            if (currentText && currentStartTime !== null && currentEndTime !== null) {
                                segments.push({
                                    start: currentStartTime,
                                    end: currentEndTime,
                                    text: currentText.trim(),
                                    speakerTag: currentSpeakerTag
                                });
                            }
                            // Reset cho segment mới
                            currentText = '';
                            currentStartTime = null;
                        }
                        currentSpeakerTag = speakerTag;
                    }

                    // Bắt đầu segment mới hoặc nối vào segment hiện tại
                    if (currentStartTime === null) {
                        currentStartTime = wordStart;
                    }
                    currentEndTime = wordEnd; // Luôn cập nhật thời gian kết thúc
                    currentText += (currentText ? ' ' : '') + wordText;

                    // (Tùy chọn) Giới hạn độ dài segment theo số từ hoặc khi là từ cuối cùng
                    // Bạn có thể giữ lại logic này hoặc điều chỉnh nó.
                    // Nếu ưu tiên ngắt theo người nói, logic này có thể không cần thiết nếu các đoạn nói ngắn.
                    const wordCountInCurrentText = currentText.split(' ').length;
                    const isLastWordInAlternative = wordIndex === alternative.words.length - 1;

                    if ((config.diarizationConfig?.enableSpeakerDiarization && isLastWordInAlternative) ||
                        (!config.diarizationConfig?.enableSpeakerDiarization && (wordCountInCurrentText >= 15 || isLastWordInAlternative))
                    ) {
                        if (currentText && currentStartTime !== null && currentEndTime !== null) {
                            segments.push({
                                start: currentStartTime,
                                end: currentEndTime,
                                text: currentText.trim(),
                                // Gán speakerTag cho segment, ngay cả khi diarization không bật (sẽ là undefined/null)
                                speakerTag: config.diarizationConfig?.enableSpeakerDiarization ? currentSpeakerTag : undefined
                            });
                            currentText = '';
                            currentStartTime = null;
                            // Không reset currentSpeakerTag ở đây nếu vẫn là cùng một người nói cho segment tiếp theo (trong trường hợp ngắt do wordCount)
                        }
                    }
                });

                // Đảm bảo segment cuối cùng của alternative được thêm vào
                if (currentText && currentStartTime !== null && currentEndTime !== null) {
                    segments.push({
                        start: currentStartTime,
                        end: currentEndTime,
                        text: currentText.trim(),
                        speakerTag: config.diarizationConfig?.enableSpeakerDiarization ? currentSpeakerTag : undefined
                    });
                }

            } else if (result.alternatives && result.alternatives[0]) {
                console.warn(`[Result ${resultIndex}] No word timings found. Transcript for this part will not be segmented by speaker.`);
                // Nếu không có word timings, chúng ta chỉ có thể lấy transcript tổng thể của result này
                // và không thể gán speakerTag một cách chính xác.
                // Thêm vào fullTranscript chung hoặc tạo một segment lớn không có speakerTag.
                const alternativeText = result.alternatives[0].transcript;
                if (alternativeText) {
                    // Heuristics để cố gắng lấy start/end time nếu có
                    let overallStartTime = null;
                    let overallEndTime = null;
                    if (segments.length > 0) { // Lấy end time của segment trước đó làm start time
                        overallStartTime = segments[segments.length - 1].end;
                    } else if (result.resultEndTime) { // Hoặc nếu có resultEndTime, ước lượng
                        overallStartTime = timeToSeconds(result.resultEndTime) - (alternativeText.length / 10); // Giả định tốc độ đọc
                    }
                    if (result.resultEndTime) {
                        overallEndTime = timeToSeconds(result.resultEndTime);
                    }

                    segments.push({
                        start: overallStartTime, // Có thể không chính xác
                        end: overallEndTime,     // Có thể không chính xác
                        text: alternativeText.trim(),
                        speakerTag: undefined // Không có thông tin người nói chi tiết
                    });
                }
            } else {
                console.warn(`[Result ${resultIndex}] Contains no valid alternatives.`);
            }
        });

        fullTranscript = segments.map(seg => seg.text).join('\n');
        const detectedSpeakerCount = config.diarizationConfig?.enableSpeakerDiarization ? allSpeakerTags.size : 0;

        console.log(`📄 Final segments array length: ${segments.length}. Final transcript length: ${fullTranscript.length}. Detected speakers: ${detectedSpeakerCount}`);

        return {
            transcription: fullTranscript,
            segments: segments, // segments này giờ đã chứa speakerTag
            rawResponse: response,
            detectedSpeakerCount: detectedSpeakerCount // Số lượng người nói được phát hiện
        };

    } catch (error) {
        console.error(`❌ Google Speech API Error for ${gcsUri}:`, error.message);
        if (error.code) console.error(`   Error code: ${error.code}`); // error.code thường hữu ích hơn error.details
        if (error.details) console.error(`   Error details: ${error.details}`);
        // throw error; // Ném lỗi để videoController có thể bắt và xử lý
        // Trả về một cấu trúc lỗi nhất quán để videoController xử lý
        return {
            transcription: '',
            segments: [],
            rawResponse: null, // Hoặc error.response nếu có
            error: error.message || 'Unknown transcription error',
            detectedSpeakerCount: 0
        };
    }
}


async function translateText(text, targetLang) {
    try {
        if (!text || !targetLang) {
            throw new Error('Text and target language are required for translation');
        }
        
        console.log(`🌐 Translating text to ${targetLang}...`);
        const [translation] = await translate.translate(text, targetLang);
        console.log(`✔️ Translation completed`);
        return translation;
    } catch (error) {
        console.error('❌ Translation error:', error.message);
        throw new Error(`Failed to translate text: ${error.message}`);
    }
}

module.exports = {
    uploadToGCS,
    transcribeAudioFromGCS,
    translateText,
};
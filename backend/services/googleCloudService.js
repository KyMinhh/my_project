const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const { TextToSpeechClient } = require('@google-cloud/text-to-speech'); // NEW
const path = require('path');
const fs = require('fs').promises;

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
const ttsClient = new TextToSpeechClient(); // NEW

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

                // Logic mới để xử lý segments với speakerTag VÀ word timestamps
                let currentSpeakerTag = null;
                let currentText = '';
                let currentStartTime = null;
                let currentEndTime = null;
                let currentWords = []; // 🆕 Lưu word-level timestamps

                alternative.words.forEach((wordInfo, wordIndex) => {
                    const wordStart = timeToSeconds(wordInfo.startTime);
                    const wordEnd = timeToSeconds(wordInfo.endTime);
                    const wordText = wordInfo.word;
                    const speakerTag = wordInfo.speakerTag; // Lấy speakerTag

                    if (wordStart === null || wordEnd === null) {
                        console.warn(`[Result ${resultIndex}, Word ${wordIndex}] ('${wordText}') has invalid timestamps.`);
                        return; // Bỏ qua từ này nếu thời gian không hợp lệ
                    }

                    // 🆕 Tạo word object với timestamps chính xác từ Google STT
                    const wordObj = {
                        word: wordText,
                        start: wordStart,
                        end: wordEnd,
                        speakerTag: speakerTag,
                        confidence: wordInfo.confidence || null // Word-level confidence
                    };

                    if (config.diarizationConfig?.enableSpeakerDiarization) {
                        allSpeakerTags.add(speakerTag); // Thêm tag vào Set để đếm số người nói duy nhất

                        if (currentSpeakerTag !== speakerTag && currentSpeakerTag !== null) {
                            // Người nói thay đổi, lưu segment cũ (nếu có)
                            if (currentText && currentStartTime !== null && currentEndTime !== null) {
                                segments.push({
                                    start: currentStartTime,
                                    end: currentEndTime,
                                    text: currentText.trim(),
                                    speakerTag: currentSpeakerTag,
                                    words: currentWords // 🆕 Bao gồm word timestamps
                                });
                            }
                            // Reset cho segment mới
                            currentText = '';
                            currentStartTime = null;
                            currentWords = []; // 🆕 Reset words array
                        }
                        currentSpeakerTag = speakerTag;
                    }

                    // Bắt đầu segment mới hoặc nối vào segment hiện tại
                    if (currentStartTime === null) {
                        currentStartTime = wordStart;
                    }
                    currentEndTime = wordEnd; // Luôn cập nhật thời gian kết thúc
                    currentText += (currentText ? ' ' : '') + wordText;
                    currentWords.push(wordObj); // 🆕 Thêm word vào array

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
                                speakerTag: config.diarizationConfig?.enableSpeakerDiarization ? currentSpeakerTag : undefined,
                                words: currentWords // 🆕 Bao gồm word timestamps
                            });
                            currentText = '';
                            currentStartTime = null;
                            currentWords = []; // 🆕 Reset words array
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
                        speakerTag: config.diarizationConfig?.enableSpeakerDiarization ? currentSpeakerTag : undefined,
                        words: currentWords // 🆕 Bao gồm word timestamps
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

        // 🆕 Merge segments by sentence boundaries for better readability
        const mergedSegments = mergeSegmentsBySentence(segments);

        console.log(`📄 Raw segments: ${segments.length} → Merged segments: ${mergedSegments.length}. Detected speakers: ${detectedSpeakerCount}`);

        return {
            transcription: fullTranscript,
            segments: mergedSegments, // Return merged segments with better sentence boundaries
            rawResponse: response,
            detectedSpeakerCount: detectedSpeakerCount
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

/**
 * 🆕 Merge segments by sentence boundaries for better readability
 * Combines incomplete sentences that were split mid-thought
 * @param {Array} segments - Raw segments from Google STT
 * @returns {Array} - Merged segments respecting sentence boundaries
 */
function mergeSegmentsBySentence(segments) {
    if (!segments || segments.length === 0) return segments;

    const merged = [];
    let currentSegment = null;

    // Sentence terminators
    const sentenceEnders = ['.', '!', '?', '。', '！', '？']; // Include Asian punctuation

    // Conjunctions that indicate incomplete thought
    const continuationWords = /\b(and|or|but|so|yet|because|although|while|when|if|then|also|however|therefore|và|hoặc|nhưng|vì|nên|mà|để)\s*$/i;

    for (const segment of segments) {
        if (!currentSegment) {
            currentSegment = {
                start: segment.start,
                end: segment.end,
                text: segment.text?.trim() || '',
                speakerTag: segment.speakerTag,
                words: segment.words ? [...segment.words] : []
            };
            continue;
        }

        // Check conditions for merging
        const currentText = currentSegment.text.trim();
        const nextText = segment.text?.trim() || '';
        const lastChar = currentText.slice(-1);

        // Conditions to merge:
        // 1. Previous doesn't end with sentence terminator
        const noSentenceEnd = !sentenceEnders.includes(lastChar);

        // 2. Current starts with lowercase (continuation) - for Latin scripts
        const startsWithLowercase = /^[a-z]/.test(nextText);

        // 3. Previous ends with conjunction
        const endsWithConjunction = continuationWords.test(currentText);

        // 4. Same speaker (if speaker diarization is enabled)
        const sameSpeaker = currentSegment.speakerTag === undefined ||
            segment.speakerTag === undefined ||
            currentSegment.speakerTag === segment.speakerTag;

        // 5. Time gap is small (< 2 seconds) - natural speech pause
        const smallTimeGap = segment.start - currentSegment.end < 2.0;

        // Decide to merge
        const shouldMerge = sameSpeaker && smallTimeGap && (
            noSentenceEnd ||
            startsWithLowercase ||
            endsWithConjunction
        );

        if (shouldMerge) {
            // Merge segments
            currentSegment.text = currentText + ' ' + nextText;
            currentSegment.end = segment.end;

            // Merge word timestamps if available
            if (segment.words && segment.words.length > 0) {
                currentSegment.words = [...(currentSegment.words || []), ...segment.words];
            }
        } else {
            // Save current and start new segment
            merged.push(currentSegment);
            currentSegment = {
                start: segment.start,
                end: segment.end,
                text: nextText,
                speakerTag: segment.speakerTag,
                words: segment.words ? [...segment.words] : []
            };
        }
    }

    // Don't forget the last segment
    if (currentSegment && currentSegment.text) {
        merged.push(currentSegment);
    }

    // Post-process: Clean up text
    return merged.map(segment => ({
        ...segment,
        text: cleanupText(segment.text)
    }));
}

/**
 * Clean up text formatting
 */
function cleanupText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')           // Remove extra spaces
        .replace(/\s+([.,!?])/g, '$1')  // Fix punctuation spacing
        .replace(/([.,!?])(\w)/g, '$1 $2') // Add space after punctuation if missing
        .trim();
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


/**
 * Text-to-Speech: Convert text to speech audio
 * @param {string} text - Text to convert
 * @param {string} languageCode - Language code (e.g., 'vi-VN', 'en-US')
 * @param {object} voiceConfig - Voice configuration
 * @returns {Promise<Buffer>} Audio content as buffer
 */
async function textToSpeech(text, languageCode, voiceConfig = {}) {
    try {
        const {
            voiceName = null,        // Auto-select if null
            gender = 'NEUTRAL',      // MALE, FEMALE, NEUTRAL
            speakingRate = 1.0,      // 0.25 to 4.0
            pitch = 0.0,             // -20.0 to 20.0
            volumeGainDb = 0.0       // -96.0 to 16.0
        } = voiceConfig;

        console.log(`🎙️ Generating speech for language: ${languageCode}`);

        // Auto-select best voice if not specified
        const selectedVoice = voiceName || await selectBestVoice(languageCode, gender);

        const request = {
            input: { text },
            voice: {
                languageCode,
                name: selectedVoice,
                ssmlGender: gender
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate,
                pitch,
                volumeGainDb
            }
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        console.log(`✅ Speech generated successfully (${response.audioContent.length} bytes)`);

        return response.audioContent;
    } catch (error) {
        console.error('❌ Text-to-Speech error:', error.message);
        throw new Error(`Failed to generate speech: ${error.message}`);
    }
}

/**
 * Get available voices for a language
 * @param {string} languageCode - Language code (e.g., 'vi-VN')
 * @returns {Promise<Array>} Array of available voices
 */
async function getVoicesForLanguage(languageCode) {
    try {
        console.log(`🔍 Fetching voices for language: ${languageCode}`);

        const [result] = await ttsClient.listVoices({ languageCode });

        const voices = result.voices.map(voice => ({
            name: voice.name,
            gender: voice.ssmlGender,
            languageCodes: voice.languageCodes,
            naturalSampleRateHertz: voice.naturalSampleRateHertz,
            // Prioritize Neural2 > Wavenet > Standard
            quality: voice.name.includes('Neural2') ? 'premium' :
                voice.name.includes('Wavenet') ? 'high' : 'standard'
        }));

        console.log(`✅ Found ${voices.length} voices for ${languageCode}`);
        return voices;
    } catch (error) {
        console.error('❌ Error fetching voices:', error.message);
        throw new Error(`Failed to get voices: ${error.message}`);
    }
}

/**
 * Auto-select best voice for language
 * @param {string} languageCode - Language code
 * @param {string} preferredGender - Preferred gender (MALE, FEMALE, NEUTRAL)
 * @returns {Promise<string>} Voice name
 */
async function selectBestVoice(languageCode, preferredGender = 'NEUTRAL') {
    try {
        const voices = await getVoicesForLanguage(languageCode);

        if (voices.length === 0) {
            throw new Error(`No voices available for language: ${languageCode}`);
        }

        // Prefer Neural2 > Wavenet > Standard, matching gender
        const neural2 = voices.find(v =>
            v.name.includes('Neural2') && v.gender === preferredGender
        );
        if (neural2) return neural2.name;

        const wavenet = voices.find(v =>
            v.name.includes('Wavenet') && v.gender === preferredGender
        );
        if (wavenet) return wavenet.name;

        // Fallback to any voice with matching gender
        const anyGender = voices.find(v => v.gender === preferredGender);
        if (anyGender) return anyGender.name;

        // Ultimate fallback: first available voice
        return voices[0].name;
    } catch (error) {
        console.error('❌ Error selecting voice:', error.message);
        // Fallback to standard voice naming convention
        return `${languageCode}-Standard-A`;
    }
}

/**
 * Detect language from audio file
 * @param {string} gcsUri - GCS URI of audio file
 * @param {Array<string>} languageHints - Optional language hints
 * @returns {Promise<string>} Detected language code
 */
async function detectLanguageFromAudio(gcsUri, languageHints = []) {
    try {
        console.log(`🔍 Detecting language from audio: ${gcsUri}`);

        // Default language hints if not provided
        const hints = languageHints.length > 0 ? languageHints : [
            'vi-VN', 'en-US', 'ja-JP', 'ko-KR', 'zh-CN',
            'th-TH', 'id-ID', 'es-ES', 'fr-FR', 'de-DE'
        ];

        const config = {
            encoding: 'LINEAR16',
            languageCode: hints[0], // Primary hint
            alternativeLanguageCodes: hints.slice(1, 4), // Up to 3 alternatives
            enableAutomaticPunctuation: true,
            model: 'default'
        };

        const audio = { uri: gcsUri };
        const request = { config, audio };

        const [operation] = await speechClient.longRunningRecognize(request);
        const [response] = await operation.promise();

        if (response.results && response.results.length > 0) {
            const detectedLang = response.results[0].languageCode || hints[0];
            console.log(`✅ Detected language: ${detectedLang}`);
            return detectedLang;
        }

        console.warn('⚠️ Could not detect language, using default');
        return hints[0];
    } catch (error) {
        console.error('❌ Language detection error:', error.message);
        throw new Error(`Failed to detect language: ${error.message}`);
    }
}

/**
 * Generate speech with SSML for advanced control
 * @param {string} ssml - SSML text
 * @param {string} languageCode - Language code
 * @param {object} voiceConfig - Voice configuration
 * @returns {Promise<Buffer>} Audio content
 */
async function textToSpeechSSML(ssml, languageCode, voiceConfig = {}) {
    try {
        const {
            voiceName = null,
            gender = 'NEUTRAL',
            speakingRate = 1.0,
            pitch = 0.0
        } = voiceConfig;

        const selectedVoice = voiceName || await selectBestVoice(languageCode, gender);

        const request = {
            input: { ssml },
            voice: {
                languageCode,
                name: selectedVoice,
                ssmlGender: gender
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate,
                pitch
            }
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('❌ SSML TTS error:', error.message);
        throw new Error(`Failed to generate SSML speech: ${error.message}`);
    }
}

/**
 * Save TTS audio to file
 * @param {Buffer} audioContent - Audio buffer from TTS
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} Path to saved file
 */
async function saveTTSAudio(audioContent, outputPath) {
    try {
        await fs.writeFile(outputPath, audioContent, 'binary');
        console.log(`✅ Audio saved to: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('❌ Error saving audio:', error.message);
        throw new Error(`Failed to save audio: ${error.message}`);
    }
}

module.exports = {
    uploadToGCS,
    transcribeAudioFromGCS,
    translateText,
    // NEW TTS functions
    textToSpeech,
    textToSpeechSSML,
    getVoicesForLanguage,
    selectBestVoice,
    detectLanguageFromAudio,
    saveTTSAudio
};
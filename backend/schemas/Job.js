
const mongoose = require('mongoose');


const segmentSchema = new mongoose.Schema({
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
    speakerTag: { type: Number }
}, { _id: false });

const jobSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    videoFileName: { type: String },
    originalName: { type: String },
    status: { 
        type: String,
        enum: ['queued', 'pending', 'processing', 'completed', 'failed', 'error'],
        default: 'queued'
    },
    fileSize: { type: Number },
    duration: { type: Number },
    gcsAudioUri: { type: String },
    transcriptionResult: { type: String },
    segments: [segmentSchema],
    translatedTranscript: [{
        start: { type: Number },
        end: { type: Number },
        text: { type: String },
        translatedText: { type: String },
        speakerTag: { type: Number }
    }],
    targetLang: { type: String },
    errorMessage: { type: String },
    createdAt: { type: Date, default: Date.now },

    sourceType: {
        type: String,
        enum: ['upload', 'youtube', 'tiktok'],
        default: 'upload'
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
}, {
    timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);
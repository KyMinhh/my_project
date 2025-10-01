require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'myspeechtt1';

module.exports = {
    BUCKET_NAME,
    storage,
};

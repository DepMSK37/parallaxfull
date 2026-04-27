"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function validateEnv() {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
    if (!TELEGRAM_BOT_TOKEN) {
        throw new Error('Missing TELEGRAM_BOT_TOKEN in environment variables.');
    }
    if (!GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY in environment variables.');
    }
    return {
        TELEGRAM_BOT_TOKEN,
        GEMINI_API_KEY,
        LOG_LEVEL,
    };
}
exports.env = validateEnv();

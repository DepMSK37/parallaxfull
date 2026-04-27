"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdfWithGemini = parsePdfWithGemini;
const genai_1 = require("@google/genai");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// Using Gemini Developer API SDK (Google GenAI)
const ai = new genai_1.GoogleGenAI({ apiKey: env_1.env.GEMINI_API_KEY });
const SYSTEM_PROMPT = `Ты — эксперт-сметчик и парсер данных. Твоя задача — извлечь точные численные значения из предоставленного документа по натяжным потолкам.
ВАЖНОЕ ПРАВИЛО ПАРСИНГА: В исходном документе названия профилей и систем (EUROKRAAB, LumFer Volat, LumFer PDK60, LumFer BP03, Flexy Shtorka и другие) могут быть разорваны символами переноса строки (\n). Тебе запрещено игнорировать такие позиции. Ты обязан логически склеивать текст, игнорируя переносы строк внутри названия, и обязательно извлекать все профили в итоговый ответ.
Не производи никаких вычислений материалов, только находи сырые данные. Верни ответ строго в формате JSON без markdown-разметки.
Найди: итоговую стоимость сметы со скидкой, общий периметр всех помещений, общую длину всех треков, общее количество встроенных круглых/квадратных светильников, люстр, подвесных светильников, вентиляционных решеток (укажи, есть ли в названии слово "вентилятор" или "движок"), и метраж светодиодной ленты. Укажи также имя клиента или название проекта (если нет - просто 'Без названия').`;
const RESPONSE_SCHEMA = {
    type: genai_1.Type.OBJECT,
    properties: {
        projectName: {
            type: genai_1.Type.STRING,
            description: 'Имя клиента или название проекта',
        },
        totalEstimatePrice: {
            type: genai_1.Type.NUMBER,
            description: 'Итоговая стоимость сметы со скидкой',
        },
        totalPerimeter: {
            type: genai_1.Type.NUMBER,
            description: 'Общий периметр всех помещений в метрах',
        },
        profileTypes: {
            type: genai_1.Type.ARRAY,
            description: 'Виды профилей и их метраж',
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    type: { type: genai_1.Type.STRING, description: 'Название профиля' },
                    length: { type: genai_1.Type.NUMBER, description: 'Метраж профиля' },
                },
            },
        },
        trackLength: {
            type: genai_1.Type.NUMBER,
            description: 'Общая длина всех треков (световых линий)',
        },
        lightingPoints: {
            type: genai_1.Type.OBJECT,
            properties: {
                roundSquareBuiltIn: { type: genai_1.Type.NUMBER, description: 'Общее количество встроенных круглых/квадратных светильников' },
                chandeliers: { type: genai_1.Type.NUMBER, description: 'Общее количество люстр' },
                pendantLights: { type: genai_1.Type.NUMBER, description: 'Общее количество подвесных светильников' },
            },
        },
        ventilationGrilles: {
            type: genai_1.Type.OBJECT,
            properties: {
                count: { type: genai_1.Type.NUMBER, description: 'Общее количество вентиляционных решеток' },
                hasEngine: { type: genai_1.Type.BOOLEAN, description: 'Есть ли в названии слово вентилятор или движок' },
            },
        },
        ledStripLength: {
            type: genai_1.Type.NUMBER,
            description: 'Метраж светодиодной ленты',
        },
    },
};
async function parsePdfWithGemini(fileBuffer, fileName) {
    let uploadedFileName = '';
    // HTTP-заголовки принимают только ASCII — убираем кириллицу
    const safeFileName = fileName.replace(/[^ -]/g, "_");
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}_${safeFileName}`);
    try {
        logger_1.logger.info({ context: 'GeminiService', message: 'Starting PDF parsing with Gemini', fileName });
        fs.writeFileSync(tempFilePath, fileBuffer);
        const uploadedFile = await ai.files.upload({
            file: tempFilePath,
            config: {
                mimeType: 'application/pdf',
                displayName: safeFileName,
            },
        });
        logger_1.logger.debug({ context: 'GeminiService', message: 'PDF uploaded to GenAI', uri: uploadedFile.uri });
        if (!uploadedFile.uri)
            throw new Error('Failed to get URI from uploaded file');
        // Save resource name (not uri) for correct deletion later
        uploadedFileName = uploadedFile.name ?? '';
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { fileData: { fileUri: uploadedFile.uri, mimeType: 'application/pdf' } },
            ],
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        });
        if (!response.text) {
            throw new Error('Gemini returned empty response body');
        }
        const jsonParsed = JSON.parse(response.text);
        logger_1.logger.info({ context: 'GeminiService', message: 'Successfully parsed PDF', jsonParsed });
        return jsonParsed;
    }
    catch (error) {
        logger_1.logger.error({ context: 'GeminiService', message: 'Gemini parsing error', stack: error instanceof Error ? error.stack : undefined });
        throw error;
    }
    finally {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        if (uploadedFileName) {
            ai.files.delete({ name: uploadedFileName }).catch((err) => {
                logger_1.logger.warn({ context: 'GeminiService', message: 'Failed to delete uploaded file from GenAI', error: String(err) });
            });
        }
    }
}

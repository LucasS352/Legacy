const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const MODEL = process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash';

console.log('Testing Gemini API...');
console.log('API Key:', API_KEY ? `${API_KEY.slice(0, 10)}...` : 'NOT SET');
console.log('Model:', MODEL);

const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
        console.error('ERROR: Request timed out after 20 seconds');
        process.exit(1);
    }, 20000);

    try {
        const model = genAI.getGenerativeModel({ model: MODEL });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Responda apenas: funcionando' }] }],
        });
        clearTimeout(timeout);
        console.log('SUCCESS:', result.response.text());
    } catch (err) {
        clearTimeout(timeout);
        console.error('FULL ERROR:', {
            message: err.message,
            status: err.status,
            statusText: err.statusText,
            code: err.code,
            errorDetails: err.errorDetails,
            stack: err.stack?.split('\n').slice(0, 3).join('\n'),
        });
        process.exit(1);
    }
}

test();

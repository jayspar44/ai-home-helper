// Gemini AI setup for Vercel serverless functions
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function initializeGemini() {
  if (genAI) {
    return genAI;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

module.exports = { initializeGemini };
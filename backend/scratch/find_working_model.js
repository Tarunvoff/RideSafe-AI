const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function findWorkingModel() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);

  // List of models to try in order of preference
  const modelsToTry = [
    'gemini-1.0-pro',
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash'
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Checking ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      await result.response;
      console.log(`✅ SUCCESS: ${modelName} works!`);
      return;
    } catch (err) {
      console.error(`❌ FAILED: ${modelName} - ${err.message}`);
    }
  }
}

findWorkingModel();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testModel() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);
  
  // The user asked for "2.5 flash". There is no 2.5 yet. 
  // 2.0-flash is the newest. I will test if it works.
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent("Test");
    console.log('gemini-2.0-flash works!');
  } catch (err) {
    console.error('gemini-2.0-flash failed: ' + err.message);
  }
}

testModel();

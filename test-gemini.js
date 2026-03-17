import dotenv from 'dotenv';
dotenv.config();

const prompt = "A simple red circle on a white background";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${process.env.GEMINI_API_KEY}`;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
  })
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Full response:', JSON.stringify(data, null, 2));

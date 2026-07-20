import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Always return valid JSON headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, image } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image attachment is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY server environment variable is not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are WyCode AI, a professional coding assistant. Sound human, friendly, use simple English. Be concise. Always wrap all code in markdown code blocks with the correct language. After code, add 1 sentence explanation. If debugging, explain error simply then give fix. Tech stack: React, Tailwind, Firebase, Vercel."
    });

    const contents = [];

    // Attach Base64 Image if uploaded
    if (image && image.data && image.mimeType) {
      contents.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    // Add prompt text
    contents.push(prompt || "Analyze this code image/attachment.");

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error("Gemini Backend Error:", error);
    return res.status(500).json({ error: error.message || 'An error occurred processing request' });
  }
      }

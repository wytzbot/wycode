export default async function handler(req, res) {
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
    const { prompt, image } = req.body || {};

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image attachment is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Vercel Environment Variables.' });
    }

    const parts = [];

    // Image payload
    if (image && image.data && image.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    // Text payload
    if (prompt) {
      parts.push({ text: prompt });
    }

    const systemInstruction = "You are WyCode AI, a professional coding assistant. Sound human, friendly, use simple English. Be concise. Always wrap all code in markdown code blocks with the correct language. After code, add 1 sentence explanation. If debugging, explain error simply then give fix. Tech stack: React, Tailwind, Firebase, Vercel.";

    // Primary model target
    const targetModel = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const requestPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{ parts: parts }]
    };

    // Helper for fetch with 1-step retry backoff on 429 Rate Limits
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    // If rate limited (429), wait 2.5s and retry once automatically
    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
    }

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `API error (${response.status})`;
      return res.status(response.status).json({ error: errMsg });
    }

    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: error.message || 'Server processing error' });
  }
        }

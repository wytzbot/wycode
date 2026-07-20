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
    const { prompt, image } = req.body || {};

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image attachment is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set in Vercel settings.' });
    }

    // Prepare contents payload for Gemini API
    const parts = [];

    // Add image if attached
    if (image && image.data && image.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    // Add prompt text
    if (prompt) {
      parts.push({ text: prompt });
    }

    const systemInstruction = "You are WyCode AI, a professional coding assistant. Sound human, friendly, use simple English. Be concise. Always wrap all code in markdown code blocks with the correct language. After code, add 1 sentence explanation. If debugging, explain error simply then give fix. Tech stack: React, Tailwind, Firebase, Vercel.";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: parts
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Gemini API returned status ${response.status}`;
      return res.status(response.status).json({ error: errorMessage });
    }

    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response text generated.";

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred' });
  }
           }

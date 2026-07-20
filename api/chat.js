// Simple in-memory cache map (persists across warm serverless executions)
const responseCache = new Map();
const MAX_CACHE_SIZE = 100; // Keep memory footprint small

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

    // Generate a unique cache key based on prompt and/or image data
    const cacheKey = JSON.stringify({ prompt: prompt?.trim().toLowerCase(), hasImage: !!image });

    // 1. Check Cache Hit
    if (responseCache.has(cacheKey)) {
      console.log("Serving response from server cache...");
      return res.status(200).json({ 
        reply: responseCache.get(cacheKey),
        cached: true 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured in Vercel.' });
    }

    const parts = [];

    // Base64 Image handling
    if (image && image.data && image.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    // Prompt text handling
    if (prompt) {
      parts.push({ text: prompt });
    }

    const systemInstruction = "You are WyCode AI, a professional coding assistant. Sound human, friendly, use simple English. Be concise. Always wrap all code in markdown code blocks with the correct language. After code, add 1 sentence explanation. If debugging, explain error simply then give fix. Tech stack: React, Tailwind, Firebase, Vercel.";

    const requestBody = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{ parts: parts }]
    });

    // Model fallback chain
    const modelCandidates = ["gemini-3.5-flash", "gemini-2.5-flash-lite"];
    let lastError = "";

    for (const model of modelCandidates) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        let response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody
        });

        // Retry once on rate limits (429)
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
          });
        }

        const data = await response.json();

        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const replyText = data.candidates[0].content.parts[0].text;

          // 2. Save result to cache (if cache is full, delete oldest item)
          if (responseCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = responseCache.keys().next().value;
            responseCache.delete(oldestKey);
          }
          responseCache.set(cacheKey, replyText);

          return res.status(200).json({ reply: replyText, cached: false });
        }

        lastError = data?.error?.message || `Model ${model} returned error status ${response.status}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({ error: `All model endpoints failed: ${lastError}` });

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
        }

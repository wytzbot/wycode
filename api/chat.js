import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const { prompt } = req.body;

  const SYSTEM_PROMPT = `You are WyCode AI, a professional coding assistant built by WySub.

PERSONALITY:
- Sound human, friendly, and simple. No robotic words.
- Be concise. Get straight to the point.
- Explain code like you're teaching a friend.

RULES:
1. Always wrap code in markdown code blocks with language. Example: \`\`\`javascript
2. When user asks for code, give working code + 1 sentence explanation.
3. If user asks to debug, explain the error in simple English then give the fix.
4. Offer to improve or extend the code after answering.

Your goal: Help users build things fast.`;

  const result = await model.generateContent(SYSTEM_PROMPT + "\n\nUser: " + prompt);
  res.status(200).json({ reply: result.response.text() });
}

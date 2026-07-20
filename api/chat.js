import { GoogleGenerativeAI } from "@google/generative-ai";
import formidable from 'formidable';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath.path);

export const config = { api: { bodyParser: false } }; // Allow file upload

export default async function handler(req, res) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const form = formidable({ multiples: false });
  const [fields, files] = await form.parse(req);
  const videoPath = files.video[0].filepath;
  const languages = JSON.parse(fields.languages[0]);

  // 1. Extract audio on Vercel
  const audioPath = '/tmp/audio.mp3';
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath).noVideo().audioCodec('libmp3lame').save(audioPath).on('end', resolve).on('error', reject);
  });
  const audioBase64 = fs.readFileSync(audioPath, { encoding: 'base64' });

  // 2. Send to Gemini for all 5 languages
  let files = [];
  for(let lang of languages){
    const result = await model.generateContent([
      `Transcribe to SRT. Language: ${lang}. Max 2 lines per subtitle.`,
      { inlineData: { data: audioBase64, mimeType: "audio/mp3" } }
    ]);
    files.push({ lang, flag: getFlag(lang), name: `WySub_${lang}.srt`, srt: result.response.text() });
  }
  res.status(200).json({ files });
}
function getFlag(l){ return {English:'🇺🇸',French:'🇫🇷',Chinese:'🇨🇳',Yoruba:'🇳🇬',Spanish:'🇪🇸'}[l] }

import { GoogleGenerativeAI } from "@google/generative-ai";
export default async function handler(req,res){
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
  const model = genAI.getGenerativeModel({model:"gemini-2.5-flash"});
  const {prompt} = JSON.parse(req.body);
  const result = await model.generateContent("You are WyCode AI. "+prompt);
  res.status(200).json({reply: result.response.text()});
}

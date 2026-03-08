import { GoogleGenerativeAI } from "@google/generative-ai";

export type TutorResponse = {
  reply: string;
  mode: "gemini" | "openai" | "mock";
};

export async function sendTutorPrompt(prompt: string): Promise<TutorResponse> {
  // 1. Try OpenAI (paid/override)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      // Implementation for OpenAI would go here
      // For now, let's prioritize Gemini as the primary focus for this refactor
    } catch (e) {
      console.error("OpenAI failed:", e);
    }
  }

  // 2. Try Gemini (Primary Free Tier — 1M tokens/day)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return { reply: text, mode: "gemini" };
    } catch (e) {
      console.error("Gemini failed:", e);
    }
  }

  // 3. Fallback to Mock
  return {
    reply:
      "I'm currently in offline mode. Please configure GEMINI_API_KEY for real guidance.",
    mode: "mock",
  };
}

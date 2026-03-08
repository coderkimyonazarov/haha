import { GoogleGenerativeAI } from "@google/generative-ai";

export type TutorResponse = {
  reply: string;
  mode: "gemini" | "openai" | "openrouter" | "groq" | "mock";
};

export async function sendTutorPrompt(prompt: string): Promise<TutorResponse> {
  // 1. Try OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash", // OpenRouter defaults or specific model
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`OpenRouter error: ${res.statusText}`);
      const data = await res.json() as any;
      return { reply: data.choices[0].message.content, mode: "openrouter" };
    } catch (e) {
      console.error("OpenRouter failed:", e);
    }
  }

  // 2. Try Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192", // Fast and free groq model
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`Groq error: ${res.statusText}`);
      const data = await res.json() as any;
      return { reply: data.choices[0].message.content, mode: "groq" };
    } catch (e) {
      console.error("Groq failed:", e);
    }
  }

  // 3. Try OpenAI (paid/override) - Hozircha o'chirib qo'yildi (faqat bepul AI)
  /*
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
      const data = await res.json() as any;
      return { reply: data.choices[0].message.content, mode: "openai" };
    } catch (e) {
      console.error("OpenAI failed:", e);
    }
  }
  */

  // 4. Try Gemini (Primary Free Tier — 1M tokens/day)
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

  // 5. Fallback to Mock
  return {
    reply:
      "I'm currently in offline mode. Please configure OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY for real guidance.",
    mode: "mock",
  };
}

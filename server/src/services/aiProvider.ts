import { GoogleGenerativeAI } from "@google/generative-ai";

export type TutorResponse = {
  reply: string;
  mode: "gemini" | "openai" | "openrouter" | "groq" | "mock";
};

type TutorPromptInput =
  | string
  | {
      systemPrompt: string;
      userPrompt: string;
    };

function normalizePromptInput(input: TutorPromptInput) {
  if (typeof input === "string") {
    return {
      systemPrompt: "",
      userPrompt: input,
      merged: input,
    };
  }

  const merged = [input.systemPrompt, input.userPrompt].filter(Boolean).join("\n\n");
  return {
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    merged,
  };
}

export async function sendTutorPrompt(input: TutorPromptInput): Promise<TutorResponse> {
  const normalized = normalizePromptInput(input);

  // 1. Try OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey !== "your_openrouter_api_key_here") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-preview-02-05:free", // explicit free model
          messages: [
            ...(normalized.systemPrompt
              ? [{ role: "system", content: normalized.systemPrompt }]
              : []),
            { role: "user", content: normalized.userPrompt },
          ],
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter error: ${res.status} ${res.statusText} - ${errText}`);
      }
      const data = await res.json() as any;
      if (!data.choices || !data.choices[0]) {
         throw new Error(`OpenRouter invalid response: ${JSON.stringify(data)}`);
      }
      return { reply: data.choices[0].message.content, mode: "openrouter" };
    } catch (e: any) {
      console.error("OpenRouter failed:", e.message);
    }
  }

  // 2. Try Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== "your_groq_api_key_here") {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Use a widely supported groq model
          messages: [
            ...(normalized.systemPrompt
              ? [{ role: "system", content: normalized.systemPrompt }]
              : []),
            { role: "user", content: normalized.userPrompt },
          ],
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq error: ${res.status} ${res.statusText} - ${errText}`);
      }
      const data = await res.json() as any;
      if (!data.choices || !data.choices[0]) {
         throw new Error(`Groq invalid response: ${JSON.stringify(data)}`);
      }
      return { reply: data.choices[0].message.content, mode: "groq" };
    } catch (e: any) {
      console.error("Groq failed:", e.message);
    }
  }

  // 3. Try OpenAI (paid/override) - Hozircha o'chirib qo'yildi (faqat bepul AI)
  /*
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
  ...
  }
  */

  // 4. Try Gemini (Primary Free Tier — 1M tokens/day)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(normalized.merged);
      const response = await result.response;
      const text = response.text();

      return { reply: text, mode: "gemini" };
    } catch (e: any) {
      console.error("Gemini failed:", e.message);
    }
  }

  // 5. Fallback to Mock
  return {
    reply:
      "I'm currently in offline mode. Please configure OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY with valid credits to continue.",
    mode: "mock",
  };
}

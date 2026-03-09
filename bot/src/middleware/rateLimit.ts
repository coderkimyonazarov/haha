import { limit } from "@grammyjs/ratelimiter";
import type { BotContext } from "../types";

export const generalRateLimit = limit<BotContext, any>({
  timeFrame: 8_000,
  limit: 8,
  storageClient: "MEMORY_STORE",
  onLimitExceeded: async (ctx) => {
    await ctx.reply(
      "⏳ You are sending messages too fast. Please wait a few seconds and continue.",
      { parse_mode: "HTML" },
    );
  },
});

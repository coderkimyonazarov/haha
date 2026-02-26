import { limit } from "@grammyjs/ratelimiter";
import type { BotContext } from "../bot";

/**
 * General message rate limiter: 5 messages per 10 seconds per user.
 * Replies with a friendly warning instead of crashing.
 */
export const generalRateLimit = limit<BotContext>({
  timeFrame: 10_000, // 10 seconds
  limit: 5,
  storageClient: "MEMORY_STORE",
  onLimitExceeded: async (ctx) => {
    await ctx.reply(
      `⏳ Juda tez yubormoqdasiz. Biroz kuting va qaytadan urinib ko'ring.`,
    );
  },
});

/**
 * OTP request limiter: max 3 OTP requests per 5 minutes per user.
 */
export const otpRateLimit = limit<BotContext>({
  timeFrame: 5 * 60 * 1000, // 5 minutes
  limit: 3,
  storageClient: "MEMORY_STORE",
  onLimitExceeded: async (ctx) => {
    await ctx.reply(
      `🔒 OTP kodlari chegarasiga yetdingiz. 5 daqiqadan so'ng qaytadan urinib ko'ring.`,
    );
  },
});

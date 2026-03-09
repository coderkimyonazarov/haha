import type { BotContext } from "../types";

// Registration is handled in web app for unified auth integrity.
export async function registerConversation(_conversation: unknown, ctx: BotContext) {
  await ctx.reply("Create account in web app first, then link Telegram using /link.");
}

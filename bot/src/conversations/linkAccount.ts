import type { BotContext } from "../types";

export async function linkAccountConversation(_conversation: unknown, ctx: BotContext) {
  await ctx.reply("Use /link <token> to connect Telegram with your web account.");
}

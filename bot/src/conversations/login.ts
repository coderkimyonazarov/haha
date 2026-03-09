import type { BotContext } from "../types";

// Legacy placeholder kept for backward compatibility with old imports.
// New bot flow is command-driven (see handlers/commands.ts).
export async function loginConversation(_conversation: unknown, ctx: BotContext) {
  await ctx.reply("Use /link to connect account or /dashboard once linked.");
}

import type { BotContext } from "../types";

export async function requestLogger(ctx: BotContext, next: () => Promise<void>) {
  const startedAt = Date.now();
  const userId = ctx.from?.id ? String(ctx.from.id) : "unknown";
  const updateId = ctx.update.update_id;

  try {
    await next();
    const took = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[bot][ok] update=${updateId} user=${userId} took=${took}ms`);
  } catch (error) {
    const took = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.error(`[bot][err] update=${updateId} user=${userId} took=${took}ms`, error);
    throw error;
  }
}

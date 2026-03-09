import type { BotContext } from "../types";
import { config } from "../config";

type BrandAnimationOptions = {
  caption?: string;
  force?: boolean;
};

function inCooldown(lastTs: number): boolean {
  const cooldownMs = config.BOT_BRAND_ANIMATION_COOLDOWN_SEC * 1000;
  return Date.now() - lastTs < cooldownMs;
}

export async function sendBrandAnimation(
  ctx: BotContext,
  options: BrandAnimationOptions = {},
): Promise<boolean> {
  if (!config.BOT_BRAND_ANIMATION_URL) {
    return false;
  }

  if (!options.force && inCooldown(ctx.session.lastBrandAnimationAt)) {
    return false;
  }

  try {
    await ctx.replyWithAnimation(config.BOT_BRAND_ANIMATION_URL, {
      caption: options.caption,
      parse_mode: options.caption ? "HTML" : undefined,
    });
    ctx.session.lastBrandAnimationAt = Date.now();
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[bot][brand-animation] send failed", {
      error,
      url: config.BOT_BRAND_ANIMATION_URL,
      chatId: ctx.chat?.id,
    });
    return false;
  }
}

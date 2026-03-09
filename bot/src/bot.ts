import { Bot, session } from "grammy";

import { config } from "./config";
import type { BotContext, BotSession } from "./types";
import { generalRateLimit } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/logger";
import {
  commandAi,
  commandDashboard,
  commandDeadlines,
  commandHelp,
  commandLink,
  commandPlan,
  commandProfile,
  commandQuiz,
  commandSettings,
  commandStart,
  commandTasks,
  commandToday,
  handleAiMessage,
  handlePendingLinkTokenMessage,
} from "./handlers/commands";
import { handleCallback } from "./handlers/callbacks";

const bot = new Bot<BotContext>(config.BOT_TOKEN);

bot.use(requestLogger);
bot.use(generalRateLimit);
bot.use(
  session<BotSession, BotContext>({
    initial: () => ({
      aiMode: false,
      pendingLinkToken: false,
      lastQuizId: null,
      lastActionAt: 0,
      lastBrandAnimationAt: 0,
    }),
  }),
);

bot.command("start", commandStart);
bot.command("link", commandLink);
bot.command("profile", commandProfile);
bot.command("dashboard", commandDashboard);
bot.command("plan", commandPlan);
bot.command("today", commandToday);
bot.command("tasks", commandTasks);
bot.command("deadlines", commandDeadlines);
bot.command("quiz", commandQuiz);
bot.command("ai", commandAi);
bot.command("settings", commandSettings);
bot.command("help", commandHelp);

bot.on("callback_query:data", handleCallback);

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) {
    return;
  }

  if (await handlePendingLinkTokenMessage(ctx)) {
    return;
  }

  if (ctx.session.aiMode) {
    await handleAiMessage(ctx);
    return;
  }

  await ctx.reply(
    "✨ Use /dashboard for your personalized hub, /ai for study help, or /help for all commands.",
  );
});

bot.catch(async (error) => {
  const updateId = error.ctx.update.update_id;
  // eslint-disable-next-line no-console
  console.error(`[bot][fatal] update=${updateId}`, error.error);

  try {
    await error.ctx.reply(
      "⚠️ Something went wrong on our side. Please retry in a moment.",
    );
  } catch {
    // ignore secondary delivery failures
  }
});

bot.start({
  onStart: (me) => {
    // eslint-disable-next-line no-console
    console.log(`[bot] @${me.username} started (${config.NODE_ENV})`);
    // eslint-disable-next-line no-console
    console.log(`[bot] backend=${config.BACKEND_API_URL}`);
  },
});

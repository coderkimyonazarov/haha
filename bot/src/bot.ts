import "./config"; // ← validates env vars on startup
import { Bot, Context, session } from "grammy";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { SupabaseAdapter } from "@grammyjs/storage-supabase";
import { supabase } from "./db/supabase";
import { config } from "./config";
import type { SessionData } from "./types";

// ─── Conversations ─────────────────────────────────────────────────────────────
import { registerConversation } from "./conversations/register";
import { loginConversation } from "./conversations/login";
import { linkAccountConversation } from "./conversations/linkAccount";

// ─── Handlers ─────────────────────────────────────────────────────────────────
import {
  handleStart,
  handleProfile,
  handleLogout,
  handleHelp,
} from "./handlers/commands";

// ─── Middleware ────────────────────────────────────────────────────────────────
import { generalRateLimit } from "./middleware/rateLimit";

// ─── Context type ─────────────────────────────────────────────────────────────
export type BotContext = Context & ConversationFlavor<Context>;
export type BotConversation = Conversation<BotContext>;

// ─── Create bot ───────────────────────────────────────────────────────────────
const bot = new Bot<BotContext>(config.BOT_TOKEN);

// ── 1. Rate limiting (first middleware — blocks floods before any processing)
bot.use(generalRateLimit);

// ── 2. Session: stored in Supabase bot_sessions table  ────────────────────────
bot.use(
  session<SessionData, BotContext>({
    initial: (): SessionData => ({}),
    storage: new SupabaseAdapter({ supabase, table: "bot_sessions" }),
    getSessionKey: (ctx) => (ctx.chat ? String(ctx.chat.id) : undefined),
  }),
);

// ── 3. Conversations plugin ────────────────────────────────────────────────────
bot.use(conversations());
bot.use(createConversation(registerConversation, "register"));
bot.use(createConversation(loginConversation, "login"));
bot.use(createConversation(linkAccountConversation, "link_account"));

// ─── Commands ─────────────────────────────────────────────────────────────────
bot.command("start", handleStart);
bot.command("login", (ctx) => ctx.conversation.enter("login"));
bot.command("register", (ctx) => ctx.conversation.enter("register"));
bot.command("profile", handleProfile);
bot.command("link", (ctx) => ctx.conversation.enter("link_account"));
bot.command("logout", handleLogout);
bot.command("help", handleHelp);

// ─── Reply keyboard text handlers ─────────────────────────────────────────────
bot.hears("🔑 Kirish", (ctx) => ctx.conversation.enter("login"));
bot.hears("📝 Ro'yxat", (ctx) => ctx.conversation.enter("register"));
bot.hears("ℹ️ Haqida", handleHelp);
bot.hears("❌ Bekor qilish", async (ctx) => {
  await ctx.conversation.exit();
  await ctx.reply("❌ Amal bekor qilindi.", {
    reply_markup: { remove_keyboard: true },
  });
});

// ─── Inline button callbacks ──────────────────────────────────────────────────
bot.callbackQuery("profile", handleProfile);
bot.callbackQuery("logout", handleLogout);
bot.callbackQuery("cancel", async (ctx) => {
  await ctx.conversation.exit();
  await ctx.answerCallbackQuery();
  await ctx.reply("❌ Amal bekor qilindi.", {
    reply_markup: { remove_keyboard: true },
  });
});

// Seamless register from unknown identifier callback
bot.callbackQuery(/^register:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("register");
});

bot.callbackQuery("retry_identifier", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("login");
});

bot.callbackQuery("link_account", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("link_account");
});

bot.callbackQuery("link_email", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("link_account");
});
bot.callbackQuery("link_phone", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("link_account");
});

// ─── Contact sharing (Telegram phone verification) ────────────────────────────
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;
  if (!contact.phone_number) return;

  const userId = ctx.session.userId;
  if (!userId) {
    await ctx.reply(`🔒 Avval kiring: /login`);
    return;
  }

  const { linkIdentifier, markIdentifierVerified } =
    await import("./services/auth");
  try {
    await linkIdentifier(userId, "phone", contact.phone_number, true);
    await markIdentifierVerified(userId, "phone");
    await ctx.reply(
      `✅ Telefon raqam <code>${contact.phone_number}</code> hisobingizga ulandi!`,
      { parse_mode: "HTML", reply_markup: { remove_keyboard: true } },
    );
  } catch (err: any) {
    await ctx.reply(`❌ Xatolik: ${err.message}`, {
      reply_markup: { remove_keyboard: true },
    });
  }
});

// ─── Fallback ─────────────────────────────────────────────────────────────────
bot.on("message", async (ctx) => {
  if (ctx.message.text?.startsWith("/")) {
    await ctx.reply(`❓ Noma'lum buyruq. Ko'rish uchun /help`);
    return;
  }
  // Otherwise silently ignore (conversations handle their own waits)
});

// ─── Error handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Bot Error] Update ${ctx.update.update_id}:`, err.error);
  ctx
    .reply("⚠️ Kutilmagan xato yuz berdi. Iltimos, qaytadan urinib ko'ring.")
    .catch(() => {});
});

// ─── Start polling ─────────────────────────────────────────────────────────────
bot.start({
  onStart: (info) => {
    console.log(`🤖 @${info.username} started — ${new Date().toISOString()}`);
    console.log(`📦 Environment: ${config.NODE_ENV}`);
    if (config.SMTP_HOST) console.log(`📧 SMTP: ${config.SMTP_HOST}`);
    if (config.ADMIN_CHAT_ID)
      console.log(`🔔 Admin alerts → ${config.ADMIN_CHAT_ID}`);
  },
});

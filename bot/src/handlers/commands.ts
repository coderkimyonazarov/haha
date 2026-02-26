import type { BotContext } from "../bot";
import { getUserById } from "../services/auth";
import {
  mainMenuKeyboard,
  postLoginKeyboard,
  profileKeyboard,
  removeKeyboard,
} from "../keyboards/auth";
import { verifyJwt } from "../services/security";

// ─── /start ───────────────────────────────────────────────────────────────────
export async function handleStart(ctx: BotContext) {
  const firstName = ctx.from?.first_name ?? "Do'stim";

  // If already logged in
  if (ctx.session.userId && ctx.session.jwtToken) {
    const payload = verifyJwt(ctx.session.jwtToken);
    if (payload) {
      const user = await getUserById(ctx.session.userId);
      if (user) {
        await ctx.reply(
          `✅ Siz allaqachon kirdingiz, <b>${user.name}</b>!\n\n` +
            `Nima qilishni xohlaysiz?`,
          { parse_mode: "HTML", reply_markup: postLoginKeyboard() },
        );
        return;
      }
    }
    // JWT expired — clear session
    ctx.session.userId = undefined;
    ctx.session.jwtToken = undefined;
  }

  await ctx.reply(
    `👋 Salom, <b>${firstName}</b>!\n\n` +
      `<b>Sypev EdTech Bot</b>ga xush kelibsiz 🎓\n\n` +
      `Bu bot orqali:\n` +
      `• 📧 Email yoki 📱 telefon bilan ro'yxatdan o'tishingiz\n` +
      `• 🔗 Bir nechta hisob identifikatorlarini bog'lashingiz\n` +
      `• 🔐 Xavfsiz tizimga kirishingiz mumkin\n\n` +
      `Davom etish uchun tugmalardan birini tanlang:`,
    { parse_mode: "HTML", reply_markup: mainMenuKeyboard },
  );
}

// ─── /profile ─────────────────────────────────────────────────────────────────
export async function handleProfile(ctx: BotContext) {
  if (!ctx.session.userId) {
    await ctx.reply(`🔒 Avval kirishingiz kerak: /login`);
    return;
  }

  const user = await getUserById(ctx.session.userId);
  if (!user) {
    ctx.session.userId = undefined;
    await ctx.reply(`❌ Hisob topilmadi. Qaytadan kiring: /login`);
    return;
  }

  const { supabase } = await import("../db/supabase");
  const { data: linked } = await supabase
    .from("linked_identifiers")
    .select("type, value, is_verified")
    .eq("user_id", user.id);

  const ids = linked ?? [];
  const hasEmail = ids.some((x: any) => x.type === "email");
  const hasPhone = ids.some((x: any) => x.type === "phone");

  const idLines = ids
    .map(
      (x: any) =>
        `  • <b>${x.type}</b>: <code>${x.value}</code> ${x.is_verified ? "✅" : "⏳"}`,
    )
    .join("\n");

  await ctx.reply(
    `👤 <b>Profil</b>\n\n` +
      `🧑 Ism: <b>${user.name}</b>\n` +
      `🔖 ID: <code>${user.id.slice(0, 8)}…</code>\n` +
      `✅ Tasdiqlangan: ${user.isVerified ? "Ha" : "Yo'q"}\n` +
      `👑 Admin: ${user.isAdmin ? "Ha" : "Yo'q"}\n\n` +
      `🔗 <b>Bog\'langan identifikatorlar:</b>\n${idLines || "  —"}`,
    {
      parse_mode: "HTML",
      reply_markup: profileKeyboard(hasEmail, hasPhone),
    },
  );
}

// ─── /logout ──────────────────────────────────────────────────────────────────
export async function handleLogout(ctx: BotContext) {
  ctx.session.userId = undefined;
  ctx.session.jwtToken = undefined;
  ctx.session.pendingIdentifier = undefined;
  ctx.session.loginAttempts = undefined;

  await ctx.reply(
    `👋 Tizimdan muvaffaqiyatli chiqdingiz!\n\nQayta kirish uchun /login\nRo'yxatdan o'tish uchun /register`,
    { reply_markup: removeKeyboard },
  );
}

// ─── /help ────────────────────────────────────────────────────────────────────
export async function handleHelp(ctx: BotContext) {
  await ctx.reply(
    `ℹ️ <b>Yordam</b>\n\n` +
      `<b>Buyruqlar:</b>\n` +
      `/start — Bosh sahifa\n` +
      `/login — Tizimga kirish\n` +
      `/register — Ro'yxatdan o'tish\n` +
      `/profile — Profilm\n` +
      `/link — Yangi identifikator ulash\n` +
      `/logout — Chiqish\n` +
      `/help — Yordam\n\n` +
      `<b>Qo'llab-quvvatlash:</b> @sypev_support`,
    { parse_mode: "HTML", reply_markup: removeKeyboard },
  );
}

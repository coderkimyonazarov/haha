import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot";
import {
  identifyUser,
  identifyByTelegramId,
  getUserById,
} from "../services/auth";
import {
  verifyPassword,
  signJwt,
  recordAndCheckSuspicious,
  buildSuspiciousAlert,
} from "../services/security";
import {
  createOtp,
  verifyOtp,
  sendOtpEmail,
  otpTelegramMessage,
} from "../services/otp";
import {
  cancelKeyboard,
  otpActionsKeyboard,
  postLoginKeyboard,
  forgotPasswordKeyboard,
  unknownIdentifierKeyboard,
  removeKeyboard,
} from "../keyboards/auth";
import { detectIdentifierType } from "../types";
import { config } from "../config";

// ──────────────────────────────────────────────────────────────────────────────
// LOGIN CONVERSATION
// Flow: identifier → detect if known → password OR OTP → session issued
// ──────────────────────────────────────────────────────────────────────────────
export async function loginConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
) {
  const telegramId = String(ctx.from!.id);

  // ── Step 1: check if already logged in via Telegram ──────────────────────
  const fromTelegram = await conversation.external(() =>
    identifyByTelegramId(telegramId),
  );
  if (fromTelegram) {
    ctx.session.userId = fromTelegram.user.id;
    ctx.session.jwtToken = signJwt(fromTelegram.user.id, telegramId);
    await ctx.reply(
      `✅ Siz allaqachon kirgansiz, <b>${fromTelegram.user.name}</b>!`,
      { parse_mode: "HTML", reply_markup: postLoginKeyboard() },
    );
    return;
  }

  // ── Step 2: ask for identifier ────────────────────────────────────────────
  await ctx.reply(
    `🔑 <b>Tizimga kirish</b>\n\n` +
      `Email, telefon raqam yoki username kiriting:`,
    { parse_mode: "HTML", reply_markup: cancelKeyboard },
  );

  const idCtx = await conversation.wait();
  const rawId = idCtx.message?.text?.trim() ?? "";

  if (rawId === "❌ Bekor qilish") {
    await idCtx.reply("❌ Bekor qilindi.", { reply_markup: removeKeyboard });
    return;
  }

  const idType = detectIdentifierType(rawId);
  if (!idType) {
    await idCtx.reply(
      `❗ Noto'g'ri format. Email, telefon yoki username kiriting.`,
      { reply_markup: removeKeyboard },
    );
    return;
  }

  // ── Step 3: look up identifier ────────────────────────────────────────────
  const identity = await conversation.external(() =>
    identifyUser(rawId, idType),
  );

  // ── Seamless transition: not found → offer register ───────────────────────
  if (!identity) {
    await idCtx.reply(
      `🤔 <b>${rawId}</b> tizimda topilmadi.\n\n` +
        `Ro'yxatdan o'tishni xohlaysizmi?`,
      {
        parse_mode: "HTML",
        reply_markup: unknownIdentifierKeyboard(rawId),
      },
    );
    // wait for callback — handled in bot.ts
    return;
  }

  const { user } = identity;

  // ── Check banned ──────────────────────────────────────────────────────────
  if (user.isBanned) {
    await idCtx.reply(
      `🚫 Bu hisob bloklangan. Muammo bo'lsa, qo'llab-quvvatlash bilan bog'laning.`,
    );
    return;
  }

  // ── Step 4a: if user has password → ask for it ────────────────────────────
  if (user.passwordHash) {
    await idCtx.reply(`🔒 Parolni kiriting:`, { reply_markup: cancelKeyboard });

    let loginSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const passCtx = await conversation.wait();
      const pass = passCtx.message?.text?.trim() ?? "";

      if (pass === "❌ Bekor qilish") {
        await passCtx.reply("❌ Bekor qilindi.", {
          reply_markup: removeKeyboard,
        });
        return;
      }

      const valid = await conversation.external(() =>
        verifyPassword(user.passwordHash!, pass),
      );

      if (valid) {
        loginSuccess = true;
        // Record success
        await conversation.external(() =>
          recordAndCheckSuspicious(user.id, telegramId, true, rawId),
        );

        // Auto-link this Telegram to the account
        await conversation.external(async () => {
          const { linkIdentifier } = await import("../services/auth");
          try {
            await linkIdentifier(user.id, "telegram_id", telegramId, true);
          } catch {
            /* ok */
          }
          if (ctx.from?.username) {
            try {
              await linkIdentifier(
                user.id,
                "username",
                ctx.from.username,
                true,
              );
            } catch {
              /* ok */
            }
          }
        });

        ctx.session.userId = user.id;
        ctx.session.jwtToken = signJwt(user.id, telegramId);

        await passCtx.reply(`✅ <b>Xush kelibsiz, ${user.name}!</b>`, {
          parse_mode: "HTML",
          reply_markup: postLoginKeyboard(),
        });
        break;
      }

      // Failed
      const suspicious = await conversation.external(() =>
        recordAndCheckSuspicious(user.id, telegramId, false, rawId),
      );
      if (suspicious && config.ADMIN_CHAT_ID) {
        const alertMsg = await buildSuspiciousAlert(user, telegramId);
        await passCtx.api.sendMessage(config.ADMIN_CHAT_ID, alertMsg, {
          parse_mode: "HTML",
        });
        await passCtx.reply(
          `⚠️ Hisobingizga shubhali kirishlar aniqlandi. Administrator xabardor qilindi.`,
        );
      }

      if (attempt < 2) {
        await passCtx.reply(
          `❌ Noto'g'ri parol (${2 - attempt} urinish qoldi).\n\nParolni unutdingizmi?`,
          { reply_markup: forgotPasswordKeyboard() },
        );
      } else {
        await passCtx.reply(
          `🔒 Ko'p marta noto'g'ri parol. Keyinroq urinib ko'ring.`,
          { reply_markup: removeKeyboard },
        );
        return;
      }
    }
    if (!loginSuccess) return;
  } else {
    // ── Step 4b: no password → OTP login ─────────────────────────────────────
    const emailId = identity.linkedIds.find((l) => l.type === "email");
    const target = emailId?.value ?? rawId;

    let otp: string;
    let otpSent = false;
    try {
      otp = await conversation.external(() =>
        createOtp(user.id, target, "login"),
      );

      if (emailId?.value) {
        otpSent = await conversation.external(() =>
          sendOtpEmail(emailId.value, otp, user.name),
        );
      }
    } catch (error: any) {
      if (error.message.includes("Rate limit")) {
        await idCtx.reply(
          `⏳ Ko'p urindingiz. Iltimos 1 daqiqa kutib, so'ng qayta urining.`,
          { reply_markup: removeKeyboard },
        );
      } else {
        await idCtx.reply(`❌ Xatolik yuz berdi: ${error.message}`, {
          reply_markup: removeKeyboard,
        });
      }
      return;
    }

    await idCtx.reply(
      otpSent
        ? `📧 <b>${target}</b> manziliga OTP yuborildi.`
        : otpTelegramMessage(otp, "Kirish"),
      { parse_mode: "HTML", reply_markup: otpActionsKeyboard() },
    );

    for (let attempt = 0; attempt < 3; attempt++) {
      const otpCtx = await conversation.wait();
      const code = otpCtx.message?.text?.trim() ?? "";

      if (code === "❌ Bekor qilish") {
        await otpCtx.reply("❌ Bekor qilindi.", {
          reply_markup: removeKeyboard,
        });
        return;
      }

      const valid = await conversation.external(() =>
        verifyOtp(user.id, code, "login"),
      );
      if (valid) {
        await conversation.external(async () => {
          const { linkIdentifier } = await import("../services/auth");
          try {
            await linkIdentifier(user.id, "telegram_id", telegramId, true);
          } catch {
            /* ok */
          }
        });
        ctx.session.userId = user.id;
        ctx.session.jwtToken = signJwt(user.id, telegramId);

        await otpCtx.reply(`✅ <b>Xush kelibsiz, ${user.name}!</b>`, {
          parse_mode: "HTML",
          reply_markup: postLoginKeyboard(),
        });
        break;
      }

      if (attempt < 2) {
        await otpCtx.reply(`❌ Noto'g'ri kod (${2 - attempt} urinish qoldi):`);
      } else {
        await otpCtx.reply(`❌ Ko'p marta xato. Qaytadan /login qiling.`, {
          reply_markup: removeKeyboard,
        });
      }
    }
  }
}

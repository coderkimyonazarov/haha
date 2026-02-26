import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot";
import { linkIdentifier, markIdentifierVerified } from "../services/auth";
import {
  createOtp,
  verifyOtp,
  sendOtpEmail,
  otpTelegramMessage,
} from "../services/otp";
import {
  cancelKeyboard,
  otpActionsKeyboard,
  removeKeyboard,
} from "../keyboards/auth";
import { detectIdentifierType } from "../types";

// ──────────────────────────────────────────────────────────────────────────────
// LINK ACCOUNT CONVERSATION
// Flow (must be logged in): choose type → enter value → OTP → linked
// ──────────────────────────────────────────────────────────────────────────────
export async function linkAccountConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
) {
  const userId = ctx.session.userId;
  if (!userId) {
    await ctx.reply(`🔒 Avval tizimga kiring: /login`);
    return;
  }

  const telegramId = String(ctx.from!.id);

  await ctx.reply(
    `🔗 <b>Hisob ulash</b>\n\nUlash uchun email yoki telefon raqamingizni kiriting:`,
    { parse_mode: "HTML", reply_markup: cancelKeyboard },
  );

  const idCtx = await conversation.wait();
  const rawVal = idCtx.message?.text?.trim() ?? "";

  if (rawVal === "❌ Bekor qilish") {
    await idCtx.reply("❌ Bekor qilindi.", { reply_markup: removeKeyboard });
    return;
  }

  const idType = detectIdentifierType(rawVal);
  if (!idType || idType === "telegram_id") {
    await idCtx.reply(
      `❗ Email yoki telefon raqam kiriting.\nMisol: <code>email@example.com</code>`,
      { parse_mode: "HTML", reply_markup: removeKeyboard },
    );
    return;
  }

  // Attempt to link (will throw if taken by another user)
  try {
    await conversation.external(() =>
      linkIdentifier(userId, idType, rawVal, false),
    );
  } catch (err: any) {
    await idCtx.reply(`❌ ${err.message ?? "Bog'lash muvaffaqiyatsiz."}`, {
      reply_markup: removeKeyboard,
    });
    return;
  }

  // Send OTP
  let otp: string;
  let otpSent = false;
  try {
    otp = await conversation.external(() => createOtp(userId, rawVal, "link"));

    if (idType === "email") {
      const { getUserById } = await import("../services/auth");
      const user = await conversation.external(() => getUserById(userId));
      if (user) {
        otpSent = await conversation.external(() =>
          sendOtpEmail(rawVal, otp, user.name),
        );
      }
    }
  } catch (error: any) {
    if (error.message.includes("Rate limit")) {
      await idCtx.reply(
        `⏳ Ko'p urindingiz. Iltimos 1 daqiqa kutib, so'ng qayta urining.`,
        { reply_markup: removeKeyboard },
      );
    } else {
      await idCtx.reply(`❌ OTP yuborishda xatolik: ${error.message}`, {
        reply_markup: removeKeyboard,
      });
    }
    return;
  }

  await idCtx.reply(
    otpSent
      ? `📧 <b>${rawVal}</b> ga tasdiqlash kodi yuborildi.`
      : otpTelegramMessage(otp, "Hisob ulash"),
    { parse_mode: "HTML", reply_markup: otpActionsKeyboard() },
  );

  // Verify OTP
  for (let attempt = 0; attempt < 3; attempt++) {
    const otpCtx = await conversation.wait();
    const code = otpCtx.message?.text?.trim() ?? "";

    if (code === "❌ Bekor qilish") {
      await otpCtx.reply("❌ Bekor qilindi.", { reply_markup: removeKeyboard });
      return;
    }

    const valid = await conversation.external(() =>
      verifyOtp(userId, code, "link"),
    );
    if (valid) {
      await conversation.external(() => markIdentifierVerified(userId, idType));
      await otpCtx.reply(
        `✅ <b>${rawVal}</b> muvaffaqiyatli ulandi!\n\nEndi ushbu ${idType === "email" ? "email" : "telefon"} bilan tizimga kirishingiz mumkin.`,
        { parse_mode: "HTML", reply_markup: removeKeyboard },
      );
      return;
    }

    if (attempt < 2) {
      await otpCtx.reply(`❌ Noto'g'ri kod (${2 - attempt} urinish qoldi):`);
    } else {
      await otpCtx.reply(`❌ Ko'p marta xato. /link buyrug'ini qayta bosing.`, {
        reply_markup: removeKeyboard,
      });
    }
  }
}

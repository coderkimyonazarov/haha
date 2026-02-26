import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot";
import {
  identifyUser,
  registerUser,
  markIdentifierVerified,
} from "../services/auth";
import { hashPassword } from "../services/security";
import {
  createOtp,
  verifyOtp,
  sendOtpEmail,
  otpTelegramMessage,
} from "../services/otp";
import {
  shareContactKeyboard,
  cancelKeyboard,
  otpActionsKeyboard,
  removeKeyboard,
} from "../keyboards/auth";
import { detectIdentifierType, normalisePhone } from "../types";

const PASS_MIN_LENGTH = 8;

// ──────────────────────────────────────────────────────────────────────────────
// REGISTER CONVERSATION
// Flow: name → identifier (email/phone) → OTP verify → password → done
// ──────────────────────────────────────────────────────────────────────────────
export async function registerConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
) {
  const telegramId = String(ctx.from!.id);
  const telegramName = ctx.from!.first_name;

  // ─── Step 1: Get name ────────────────────────────────────────────────────
  await ctx.reply(
    `👋 Xush kelibsiz! Ro'yxatdan o'tish uchun to'liq ismingizni kiriting:`,
    { reply_markup: cancelKeyboard },
  );

  const nameCtx = await conversation.wait();
  const name = nameCtx.message?.text?.trim();

  if (!name || name === "❌ Bekor qilish") {
    await ctx.reply("❌ Ro'yxat bekor qilindi.", {
      reply_markup: removeKeyboard,
    });
    return;
  }

  // ─── Step 2: Get email or phone ──────────────────────────────────────────
  await nameCtx.reply(
    `📧 Endi email manzilingiz yoki telefon raqamingizni kiriting:`,
    { reply_markup: cancelKeyboard },
  );

  const idCtx = await conversation.wait();
  const rawIdentifier = idCtx.message?.text?.trim() ?? "";

  if (rawIdentifier === "❌ Bekor qilish") {
    await idCtx.reply("❌ Ro'yxat bekor qilindi.", {
      reply_markup: removeKeyboard,
    });
    return;
  }

  const idType = detectIdentifierType(rawIdentifier);
  if (!idType || idType === "telegram_id") {
    await idCtx.reply(
      `❗ Noto'g'ri format. Email yoki telefon raqam kiriting.\nMisol: <code>email@example.com</code> yoki <code>+998901234567</code>`,
      { parse_mode: "HTML", reply_markup: cancelKeyboard },
    );
    return;
  }

  // Check not already registered
  const existing = await conversation.external(() =>
    identifyUser(rawIdentifier, idType),
  );
  if (existing) {
    await idCtx.reply(
      `⚠️ Bu ${idType === "email" ? "email" : "telefon"} allaqachon ro'yxatdan o'tgan.\n` +
        `Kirish uchun /login buyrug'ini ishlating.`,
      { reply_markup: removeKeyboard },
    );
    return;
  }

  // ─── Step 3: Create user (unverified) + send OTP ────────────────────────
  const passwordHash = null; // will set after OTP verify
  const user = await conversation.external(() =>
    registerUser({
      name,
      passwordHash,
      identifierType: idType,
      identifierValue: rawIdentifier,
      isVerified: false,
    }),
  );

  let otp: string;
  let otpSent = false;
  try {
    otp = await conversation.external(() =>
      createOtp(user.id, rawIdentifier, "verify"),
    );

    if (idType === "email") {
      otpSent = await conversation.external(() =>
        sendOtpEmail(rawIdentifier, otp, name),
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

  const otpMsg = otpSent
    ? `📧 <b>${rawIdentifier}</b> manziliga tasdiqlash kodi yuborildi.`
    : `📋 Tasdiqlash kodingiz:\n\n${otpTelegramMessage(otp, "Ro'yxat")}`;

  await idCtx.reply(otpMsg, {
    parse_mode: "HTML",
    reply_markup: otpActionsKeyboard(),
  });

  // ─── Step 4: Verify OTP ──────────────────────────────────────────────────
  for (let attempt = 0; attempt < 3; attempt++) {
    const otpCtx = await conversation.wait();
    const codeInput = otpCtx.message?.text?.trim() ?? "";

    if (codeInput === "❌ Bekor qilish") {
      await otpCtx.reply("❌ Ro'yxat bekor qilindi.", {
        reply_markup: removeKeyboard,
      });
      return;
    }

    const valid = await conversation.external(() =>
      verifyOtp(user.id, codeInput, "verify"),
    );
    if (valid) {
      await conversation.external(() =>
        markIdentifierVerified(user.id, idType),
      );
      await otpCtx.reply(`✅ <b>Tasdiqlandi!</b>`, { parse_mode: "HTML" });
      break;
    }

    if (attempt < 2) {
      await otpCtx.reply(
        `❌ Noto'g'ri kod. Qaytadan urinib ko'ring (${2 - attempt} urinish qoldi):`,
      );
    } else {
      await otpCtx.reply(
        `❌ Ko'p marta noto'g'ri kod kiritildi. Qaytadan /register qiling.`,
        { reply_markup: removeKeyboard },
      );
      return;
    }
  }

  // ─── Step 5: Set password ────────────────────────────────────────────────
  await idCtx.reply(
    `🔒 Parol o'rnating (<b>kamida ${PASS_MIN_LENGTH} belgi</b>):`,
    { parse_mode: "HTML", reply_markup: cancelKeyboard },
  );

  const passCtx = await conversation.wait();
  const password = passCtx.message?.text?.trim() ?? "";

  if (password === "❌ Bekor qilish") {
    await passCtx.reply("❌ Bekor qilindi.", { reply_markup: removeKeyboard });
    return;
  }
  if (password.length < PASS_MIN_LENGTH) {
    await passCtx.reply(
      `❗ Parol kamida ${PASS_MIN_LENGTH} belgidan iborat bo'lishi kerak.`,
      { reply_markup: removeKeyboard },
    );
    return;
  }

  const hash = await conversation.external(() => hashPassword(password));
  await conversation.external(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const { config } = await import("../config");
    const sb = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    await sb.from("users").update({ password_hash: hash }).eq("id", user.id);
  });

  // ─── Step 6: Auto-link Telegram ID ───────────────────────────────────────
  await conversation.external(async () => {
    const { linkIdentifier } = await import("../services/auth");
    try {
      await linkIdentifier(user.id, "telegram_id", telegramId, true);
    } catch {
      /* already linked */
    }
    // Auto-link Telegram username if present
    if (ctx.from?.username) {
      try {
        await linkIdentifier(user.id, "username", ctx.from.username, true);
      } catch {
        /* skip */
      }
    }
  });

  // ─── Update session ───────────────────────────────────────────────────────
  const { signJwt } = await import("../services/security");
  ctx.session.userId = user.id;
  ctx.session.jwtToken = signJwt(user.id, telegramId);

  await passCtx.reply(
    `🎉 <b>Tabriklaymiz, ${name}!</b>\n\n` +
      `Hisobingiz muvaffaqiyatli yaratildi.\n` +
      `📌 Identifikator: <code>${rawIdentifier}</code>\n\n` +
      `Endi /profile buyrug'i bilan profilingizni ko'ring.`,
    { parse_mode: "HTML", reply_markup: removeKeyboard },
  );
}

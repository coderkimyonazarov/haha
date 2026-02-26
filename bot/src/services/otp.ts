import { createTransport } from "nodemailer";
import { supabase } from "../db/supabase";
import { config } from "../config";

// ─── SMTP Transporter (optional — only if SMTP vars set) ─────────────────────

function getTransport() {
  if (!config.SMTP_HOST || !config.SMTP_USER) return null;
  return createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

// ─── Generate & store OTP ─────────────────────────────────────────────────────

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(
  userId: string,
  target: string,
  purpose: "verify" | "login" | "link" = "verify",
): Promise<string> {
  const code = generateCode();
  const now = Date.now();
  const expiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);
  const oneMinuteAgo = new Date(now - 60 * 1000).toISOString();

  // Rate limit: Check if an OTP was generated in the last 1 minute
  const { data: recentOtp } = await supabase
    .from("otp_codes")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .gte("created_at", oneMinuteAgo)
    .limit(1)
    .maybeSingle();

  if (recentOtp) {
    throw new Error(
      "Rate limit: Please wait 1 minute before requesting another code.",
    );
  }

  // Invalidate previous unused codes for same user+purpose
  await supabase
    .from("otp_codes")
    .update({ is_used: true })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("is_used", false);

  const { error } = await supabase.from("otp_codes").insert({
    user_id: userId,
    target,
    code,
    purpose,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`OTP insert failed: ${error.message}`);

  return code;
}

/** Returns userId if valid, null if invalid/expired */
export async function verifyOtp(
  userId: string,
  code: string,
  purpose: "verify" | "login" | "link" = "verify",
): Promise<boolean> {
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("is_used", false)
    .gte("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;

  // Increment attempt counter
  await supabase
    .from("otp_codes")
    .update({ attempts: (data.attempts ?? 0) + 1 })
    .eq("id", data.id);

  if (data.attempts >= MAX_OTP_ATTEMPTS) {
    // Too many attempts — invalidate
    await supabase
      .from("otp_codes")
      .update({ is_used: true })
      .eq("id", data.id);
    return false;
  }

  if (data.code !== code) return false;

  // Mark used
  await supabase.from("otp_codes").update({ is_used: true }).eq("id", data.id);
  return true;
}

// ─── Send OTP via email ────────────────────────────────────────────────────────

export async function sendOtpEmail(
  email: string,
  code: string,
  name: string,
): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn("[OTP] SMTP not configured — OTP code:", code);
    return false;
  }
  try {
    await transport.sendMail({
      from: config.SMTP_FROM,
      to: email,
      subject: `Your Sypev verification code: ${code}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#6366f1">Sypev EdTech</h2>
          <p>Salom, <b>${name}</b>!</p>
          <p>Sizning tasdiqlash kodingiz:</p>
          <div style="font-size:38px;font-weight:bold;letter-spacing:12px;
                      color:#6366f1;padding:24px;background:#f0f0ff;
                      border-radius:12px;text-align:center">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;margin-top:16px">
            Kod ${OTP_TTL_MINUTES} daqiqa ichida amal qiladi.<br>
            Agar siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[OTP] Email send failed:", err);
    return false;
  }
}

/** Format OTP message for Telegram HTML mode */
export function otpTelegramMessage(code: string, purpose: string): string {
  return (
    `🔐 <b>Tasdiqlash kodi</b>\n\n` +
    `<code>${code}</code>\n\n` +
    `⏱ Kod <b>${OTP_TTL_MINUTES} daqiqa</b> ichida amal qiladi.\n` +
    `🔒 Kodni hech kimga bermang!\n\n` +
    `📌 Maqsad: <i>${purpose}</i>`
  );
}

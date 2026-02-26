import { InlineKeyboard, Keyboard } from "grammy";

// ─── Reply keyboards (shown in text field) ────────────────────────────────────

export const mainMenuKeyboard = new Keyboard()
  .text("🔑 Kirish")
  .text("📝 Ro'yxat")
  .row()
  .text("ℹ️ Haqida")
  .resized()
  .oneTime();

export const shareContactKeyboard = new Keyboard()
  .requestContact("📱 Telefon raqamni ulashish")
  .row()
  .text("❌ Bekor qilish")
  .resized()
  .oneTime();

export const cancelKeyboard = new Keyboard()
  .text("❌ Bekor qilish")
  .resized()
  .oneTime();

export const removeKeyboard = new Keyboard().resized();

// ─── Inline keyboards ─────────────────────────────────────────────────────────

/** Shown when identifier is not found — offer seamless register */
export function unknownIdentifierKeyboard(identifier: string) {
  return new InlineKeyboard()
    .text(`✅ ${identifier} bilan ro'yxatdan o'tish`, `register:${identifier}`)
    .row()
    .text("📝 Boshqa ma'lumot kiriting", "retry_identifier");
}

/** Offered when login succeeds — profile or link account */
export function postLoginKeyboard() {
  return new InlineKeyboard()
    .text("👤 Profilim", "profile")
    .text("🔗 Hisob ulash", "link_account")
    .row()
    .text("🚪 Chiqish", "logout");
}

/** OTP actions */
export function otpActionsKeyboard() {
  return new InlineKeyboard()
    .text("🔄 Kodni qayta yuborish", "resend_otp")
    .row()
    .text("❌ Bekor qilish", "cancel");
}

/** Shown to verified user on /profile */
export function profileKeyboard(hasEmail: boolean, hasPhone: boolean) {
  const kb = new InlineKeyboard();
  if (!hasEmail) kb.text("📧 Email ulash", "link_email").row();
  if (!hasPhone) kb.text("📱 Telefon ulash", "link_phone").row();
  kb.text("🔄 Parolni o'zgartirish", "change_password").row();
  kb.text("🚪 Chiqish", "logout");
  return kb;
}

/** Password reset options */
export function forgotPasswordKeyboard() {
  return new InlineKeyboard()
    .text("📧 Email orqali tiklash", "reset_via_email")
    .row()
    .text("📱 Telefon orqali tiklash", "reset_via_phone")
    .row()
    .text("❌ Bekor qilish", "cancel");
}

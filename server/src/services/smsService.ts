// ── SMS Service (Provider-Agnostic Interface) ─────────────────────────────────
// In dev mode, logs OTP to console. In production, plug in Twilio/Vonage/etc.

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

// ── Dev Logger (default — no real SMS sent) ───────────────────────────────────
class DevSmsProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`[SMS-DEV] To: ${to} | Message: ${message}`);
    return true;
  }
}

// ── Twilio Provider (production example) ──────────────────────────────────────
class TwilioSmsProvider implements SmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[SMS] Twilio credentials missing");
      return false;
    }

    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64",
      );
      const body = new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      );

      if (!res.ok) {
        const errorData = await res.text();
        console.error("[SMS] Twilio error:", errorData);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[SMS] Twilio send failed:", error);
      return false;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
let smsProvider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (!smsProvider) {
    const providerType = process.env.SMS_PROVIDER || "dev";
    switch (providerType) {
      case "twilio":
        smsProvider = new TwilioSmsProvider();
        break;
      default:
        smsProvider = new DevSmsProvider();
    }
  }
  return smsProvider;
}

// ── Helper ────────────────────────────────────────────────────────────────────
export async function sendOtpSms(
  phone: string,
  code: string,
): Promise<boolean> {
  const provider = getSmsProvider();
  return provider.sendSms(
    phone,
    `Your Sypev verification code is: ${code}. It expires in 5 minutes.`,
  );
}

// ── Phone normalization ───────────────────────────────────────────────────────
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Basic E.164 validation
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

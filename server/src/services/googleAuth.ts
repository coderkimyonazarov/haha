import { google } from "googleapis";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

// ── Get OAuth2 Client ─────────────────────────────────────────────────────────
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ── Verify Google ID Token (from frontend @react-oauth/google) ────────────────
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleUserInfo> {
  const client = getOAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Invalid Google token payload");
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
    verified_email: payload.email_verified ?? false,
  };
}

// ── Exchange Authorization Code for Tokens (server-side flow) ─────────────────
export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleUserInfo> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();

  if (!data.id || !data.email) {
    throw new Error("Failed to get user info from Google");
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name || data.email.split("@")[0],
    picture: data.picture || undefined,
    verified_email: data.verified_email ?? false,
  };
}

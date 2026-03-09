import { config } from "../config";
import type { BotDashboard, LinkedUser } from "../types";

type ApiError = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};

type ResolveUserResponse =
  | {
      linked: false;
      appUrl: string;
    }
  | {
      linked: true;
      user: LinkedUser;
    };

type LinkWithTokenResponse = {
  linked: true;
  user: LinkedUser | null;
};

type AiResponse = {
  reply: string;
  mode: string;
};

function formatNetworkError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

async function callBackend<T>(
  path: string,
  body: Record<string, unknown>,
  options: { method?: "POST" | "GET" } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.BOT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.BACKEND_API_URL}${path}`, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": config.BOT_INTERNAL_API_KEY,
      },
      body: options.method === "GET" ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    let payload: ApiEnvelope<T> | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new Error(`Backend returned invalid response (${response.status})`);
    }

    if (!response.ok || !payload.ok || !payload.data) {
      const message =
        payload.error?.message ||
        `Backend request failed (${response.status})`;
      throw new Error(message);
    }

    return payload.data;
  } catch (error) {
    throw formatNetworkError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveLinkedUser(
  telegramUserId: string,
  telegramUsername?: string,
): Promise<ResolveUserResponse> {
  return callBackend<ResolveUserResponse>("/api/bot/resolve-user", {
    telegramUserId,
    telegramUsername: telegramUsername || null,
  });
}

export async function linkWithToken(
  telegramUserId: string,
  token: string,
  telegramUsername?: string,
): Promise<LinkWithTokenResponse> {
  return callBackend<LinkWithTokenResponse>("/api/bot/link-with-token", {
    telegramUserId,
    telegramUsername: telegramUsername || null,
    token,
  });
}

export async function getBotDashboard(
  telegramUserId: string,
  telegramUsername?: string,
): Promise<BotDashboard> {
  return callBackend<BotDashboard>("/api/bot/dashboard", {
    telegramUserId,
    telegramUsername: telegramUsername || null,
  });
}

export async function askBotAi(params: {
  telegramUserId: string;
  telegramUsername?: string;
  message: string;
  context?: "SAT" | "Admissions" | "General";
}): Promise<AiResponse> {
  return callBackend<AiResponse>("/api/bot/ai", {
    telegramUserId: params.telegramUserId,
    telegramUsername: params.telegramUsername || null,
    message: params.message,
    context: params.context ?? "General",
  });
}

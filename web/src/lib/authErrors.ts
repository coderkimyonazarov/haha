type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

function normalizeError(err: unknown): Required<ErrorLike> {
  const fallback = {
    status: 0,
    code: "",
    message: "",
  };

  if (!err || typeof err !== "object") {
    return fallback;
  }

  const input = err as ErrorLike;
  return {
    status: typeof input.status === "number" ? input.status : 0,
    code: typeof input.code === "string" ? input.code : "",
    message: typeof input.message === "string" ? input.message : "",
  };
}

export function isSupabaseEmailRateLimitError(err: unknown): boolean {
  const { status, code, message } = normalizeError(err);
  const normalizedCode = code.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  return (
    status === 429 ||
    normalizedCode === "over_email_send_rate_limit" ||
    normalizedCode === "rate_limit" ||
    normalizedMessage.includes("email rate limit exceeded") ||
    (normalizedMessage.includes("rate limit") && normalizedMessage.includes("email"))
  );
}

export function getSignupErrorMessage(err: unknown): string {
  const { message } = normalizeError(err);
  if (isSupabaseEmailRateLimitError(err)) {
    return "Too many signup attempts. Please wait before trying again.";
  }
  return message || "Registration failed";
}

export function getLoginErrorMessage(err: unknown): string {
  const { status, code, message } = normalizeError(err);
  if (status === 401 && code === "SOCIAL_LOGIN_REQUIRED") {
    return message || "This account uses Google sign-in. Continue with Google.";
  }
  if (status === 401 && code === "INVALID_CREDENTIALS") {
    return "Invalid email/username or password.";
  }
  if (status === 429 || code === "RATE_LIMIT") {
    return "Too many login attempts. Please wait and try again.";
  }
  return message || "Login failed";
}

export function getGoogleOAuthErrorMessage(
  err: unknown,
  intent: "login" | "register" | "link" = "login",
): string {
  const { message } = normalizeError(err);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("unsupported provider") ||
    normalizedMessage.includes("provider is not enabled")
  ) {
    return "Google auth is not enabled in Supabase Auth providers.";
  }

  if (
    normalizedMessage.includes("redirect") &&
    (normalizedMessage.includes("allow list") ||
      normalizedMessage.includes("not allowed") ||
      normalizedMessage.includes("invalid"))
  ) {
    return "OAuth redirect URL mismatch. Add this app URL to Supabase redirect allow list.";
  }

  if (intent === "register") {
    return message || "Google registration failed";
  }
  if (intent === "link") {
    return message || "Google linking failed";
  }
  return message || "Google login failed";
}

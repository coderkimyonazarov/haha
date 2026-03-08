type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  msg?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
};

function normalizeError(err: unknown): Required<ErrorLike> {
  const fallback: Required<ErrorLike> = {
    status: 0,
    code: "",
    message: "",
    msg: "",
    error: "",
    error_code: "",
    error_description: "",
  };

  if (!err || typeof err !== "object") {
    return fallback;
  }

  const input = err as ErrorLike;
  const nested = typeof input.error === "object" && input.error ? (input.error as ErrorLike) : null;

  return {
    status:
      typeof input.status === "number"
        ? input.status
        : typeof nested?.status === "number"
          ? nested.status
          : 0,
    code:
      typeof input.code === "string"
        ? input.code
        : typeof nested?.code === "string"
          ? nested.code
          : "",
    message:
      typeof input.message === "string"
        ? input.message
        : typeof nested?.message === "string"
          ? nested.message
          : "",
    msg: typeof input.msg === "string" ? input.msg : "",
    error: typeof input.error === "string" ? input.error : "",
    error_code: typeof input.error_code === "string" ? input.error_code : "",
    error_description:
      typeof input.error_description === "string" ? input.error_description : "",
  };
}

function isRateLimitError(err: unknown): boolean {
  const { status, code, message, msg, error_code, error_description } = normalizeError(err);
  const codeLower = code.toLowerCase();
  const messageLower = message.toLowerCase();
  const msgLower = msg.toLowerCase();
  const oauthCodeLower = error_code.toLowerCase();
  const oauthDescLower = error_description.toLowerCase();

  return (
    status === 429 ||
    codeLower === "rate_limit" ||
    codeLower === "over_email_send_rate_limit" ||
    oauthCodeLower.includes("rate") ||
    messageLower.includes("rate limit") ||
    msgLower.includes("rate limit") ||
    oauthDescLower.includes("rate limit") ||
    messageLower.includes("too many requests") ||
    msgLower.includes("too many requests")
  );
}

function isProviderDisabledError(err: unknown): boolean {
  const { code, message, msg, error, error_code, error_description } = normalizeError(err);
  const combined = [code, message, msg, error, error_code, error_description]
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("unsupported provider") ||
    combined.includes("provider is not enabled") ||
    combined.includes("provider_disabled") ||
    combined.includes("oauth provider not enabled")
  );
}

function isRedirectMismatchError(err: unknown): boolean {
  const { code, message, msg, error, error_code, error_description } = normalizeError(err);
  const combined = [code, message, msg, error, error_code, error_description]
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("redirect") &&
    (combined.includes("mismatch") ||
      combined.includes("allow list") ||
      combined.includes("not allowed") ||
      combined.includes("invalid"))
  );
}

export function getSignupErrorMessage(err: unknown): string {
  const { message, msg } = normalizeError(err);

  if (isRateLimitError(err)) {
    return "Too many signup attempts. Please wait before trying again.";
  }

  return message || msg || "Registration failed";
}

export function getLoginErrorMessage(err: unknown): string {
  const { status, code, message, msg } = normalizeError(err);

  if (status === 401 && code === "SOCIAL_LOGIN_REQUIRED") {
    return message || msg || "This account was created with Google. Please sign in with Google.";
  }

  if (status === 401 && code === "INVALID_CREDENTIALS") {
    return "Invalid email/username or password.";
  }

  if (isRateLimitError(err)) {
    return "Too many login attempts. Please wait and try again.";
  }

  return message || msg || "Login failed";
}

export function getGoogleOAuthErrorMessage(
  err: unknown,
  intent: "login" | "register" | "link" = "login",
): string {
  const { code, message, msg, error_description } = normalizeError(err);

  if (isProviderDisabledError(err) || code.toLowerCase() === "validation_failed") {
    return "Google sign-in is not enabled for this project yet. Please contact support.";
  }

  if (isRedirectMismatchError(err)) {
    return "Google redirect URL is not allowed. Please contact support to update OAuth redirect settings.";
  }

  if (isRateLimitError(err)) {
    return "Too many OAuth attempts. Please wait and try again.";
  }

  const fallback = error_description || message || msg;

  if (intent === "register") {
    return fallback || "Google registration failed";
  }
  if (intent === "link") {
    return fallback || "Google linking failed";
  }
  return fallback || "Google login failed";
}

export function getGoogleOAuthErrorMessageFromUrl(currentLocation: {
  search: string;
  hash: string;
}): string | null {
  const searchParams = new URLSearchParams(currentLocation.search);
  const hashParams = new URLSearchParams(currentLocation.hash.startsWith("#") ? currentLocation.hash.slice(1) : currentLocation.hash);

  const payload = {
    error: searchParams.get("error") || hashParams.get("error") || "",
    error_code: searchParams.get("error_code") || hashParams.get("error_code") || "",
    error_description:
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      searchParams.get("message") ||
      hashParams.get("message") ||
      "",
    message: searchParams.get("error_description") || hashParams.get("error_description") || "",
  };

  if (!payload.error && !payload.error_code && !payload.error_description) {
    return null;
  }

  return getGoogleOAuthErrorMessage(payload, "login");
}

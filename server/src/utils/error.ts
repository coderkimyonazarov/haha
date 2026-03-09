export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ErrorEnvelope = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export function toSuccessEnvelope<T>(data: T): SuccessEnvelope<T> {
  return {
    ok: true,
    data,
  };
}

export function toErrorEnvelope(err: unknown): ErrorEnvelope {
  if (err instanceof AppError) {
    const error: ErrorEnvelope["error"] = {
      code: err.code,
      message: err.message,
    };

    if (err.details !== undefined) {
      error.details = err.details;
    }

    return {
      ok: false,
      error,
    };
  }

  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected error",
    },
  };
}

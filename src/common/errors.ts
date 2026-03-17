export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export class ValidationAppError extends AppError {
  constructor(details: unknown) {
    super(400, "VALIDATION_ERROR", details, "Request validation failed");
  }
}

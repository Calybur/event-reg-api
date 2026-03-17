import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ValidationAppError } from "../errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next;

  if (err instanceof ZodError) {
    const validationError = new ValidationAppError(err.flatten());
    res.status(validationError.statusCode).json({
      error: {
        code: validationError.code,
        message: validationError.message,
        details: validationError.details,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: null,
    },
  });
};

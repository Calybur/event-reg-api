import type { ErrorRequestHandler } from "express";
import { ZodError, z } from "zod";
import { logger } from "../../lib/logger";
import { AppError, ValidationAppError } from "../errors";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next;

  if (err instanceof ZodError) {
    const validationError = new ValidationAppError(z.treeifyError(err));
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        details: validationError.details,
      },
      "Request validation failed",
    );
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
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        code: err.code,
        details: err.details ?? null,
      },
      err.message,
    );
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  logger.error(
    {
      method: req.method,
      path: req.originalUrl,
      err,
    },
    "Unhandled error",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      details: null,
    },
  });
};

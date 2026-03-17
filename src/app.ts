import express from "express";
import pinoHttp from "pino-http";
import { errorHandler } from "./common/middleware/error-handler";
import { logger } from "./lib/logger";
import { eventsRouter } from "./modules/events/events.routes";

export const app = express();

app.use(express.json());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({
        method: req.method,
        path: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: () => "request handled",
    customErrorMessage: () => "request failed",
  }),
);

app.use("/api/events", eventsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(errorHandler);

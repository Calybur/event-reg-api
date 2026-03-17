import express from "express";
import pinoHttp from "pino-http";
import { errorHandler } from "./common/middleware/error-handler";
import { logger } from "./lib/logger";
import { eventsRouter } from "./modules/events/events.routes";

export const app = express();
const isHttpVerbose = process.env.LOG_HTTP_VERBOSE === "true";

const httpLoggerOptions = isHttpVerbose
  ? {
    logger,
    customSuccessMessage: () => "request handled",
    customErrorMessage: () => "request failed",
  }
  : {
    logger,
    serializers: {
      req: (req: express.Request) => ({
        method: req.method,
        path: req.url,
      }),
      res: (res: express.Response) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: () => "request handled",
    customErrorMessage: () => "request failed",
  };

app.use(express.json());
app.use(pinoHttp(httpLoggerOptions));

app.use("/api/events", eventsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(errorHandler);

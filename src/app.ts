import express from "express";
import pinoHttp from "pino-http";
import { errorHandler } from "./common/middleware/error-handler";
import { eventsRouter } from "./modules/events/events.routes";

export const app = express();

app.use(express.json());
app.use(
  pinoHttp({
    level: process.env.LOG_LEVEL ?? "info",
  }),
);

app.use("/api/events", eventsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(errorHandler);

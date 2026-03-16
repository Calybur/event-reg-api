import express from "express";
import pinoHttp from "pino-http";

export const app = express();

app.use(express.json());
app.use(
  pinoHttp({
    level: process.env.LOG_LEVEL ?? "info",
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

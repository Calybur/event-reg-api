import pino from "pino";

const streams = [
  { stream: process.stdout },
  {
    stream: pino.destination({
      dest: "logs/app.log",
      mkdir: true,
      sync: false,
    }),
  },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
  },
  pino.multistream(streams),
);

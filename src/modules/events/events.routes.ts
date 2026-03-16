import { Router } from "express";
import { getUpcomingEventsHandler } from "./events.controller";

export const eventsRouter = Router();

eventsRouter.get("/", getUpcomingEventsHandler);

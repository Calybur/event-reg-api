import { Router } from "express";
import {
	getUpcomingEventsHandler,
	registerForEventHandler,
} from "./events.controller";

export const eventsRouter = Router();

eventsRouter.get("/", getUpcomingEventsHandler);
eventsRouter.post("/:id/register", registerForEventHandler);

import type { Request, Response } from "express";
import { toEventListItemDto } from "./events.dto";
import { listUpcomingEvents } from "./events.service";

export const getUpcomingEventsHandler = async (_req: Request, res: Response): Promise<void> => {
  const events = await listUpcomingEvents();

  res.status(200).json({
    data: events.map(toEventListItemDto),
  });
};

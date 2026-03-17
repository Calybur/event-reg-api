import type { Request, Response } from "express";
import { AppError } from "../../common/errors";
import { toEventListItemDto } from "./events.dto";
import {
  registerEventBodySchema,
  registerEventParamsSchema,
} from "./events.schemas";
import {
  listUpcomingEvents,
  registerAttendeeForEvent,
  RegistrationError,
} from "./events.service";

export const getUpcomingEventsHandler = async (_req: Request, res: Response): Promise<void> => {
  const events = await listUpcomingEvents();

  res.status(200).json({
    data: events.map(toEventListItemDto),
  });
};

export const registerForEventHandler = async (req: Request, res: Response): Promise<void> => {
  const { id: eventId } = registerEventParamsSchema.parse(req.params);
  const body = registerEventBodySchema.parse(req.body);

  try {
    const registration = await registerAttendeeForEvent({
      eventId,
      email: body.email,
      name: body.name,
    });

    res.status(201).json({
      data: registration,
    });
  } catch (error: unknown) {
    if (error instanceof RegistrationError) {
      if (error.code === "EVENT_NOT_FOUND") {
        throw new AppError(404, "EVENT_NOT_FOUND", null, "Event not found");
      }

      if (error.code === "EVENT_FULL") {
        throw new AppError(409, "EVENT_FULL", null, "Event is full");
      }

      if (error.code === "ALREADY_REGISTERED") {
        throw new AppError(
          409,
          "ALREADY_REGISTERED",
          null,
          "Attendee is already registered for this event",
        );
      }
    }

    throw error;
  }
};

import type { Request, Response } from "express";
import { toEventListItemDto } from "./events.dto";
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
  const eventId = Number(req.params.id);
  const body = req.body as {
    email?: unknown;
    name?: unknown;
  };

  if (!Number.isInteger(eventId) || eventId <= 0) {
    res.status(400).json({
      error: "Invalid event id",
    });
    return;
  }

  if (
    typeof body.email !== "string"
    || typeof body.name !== "string"
    || body.email.trim().length === 0
    || body.name.trim().length === 0
  ) {
    res.status(400).json({
      error: "Email and name are required",
    });
    return;
  }

  try {
    const registration = await registerAttendeeForEvent({
      eventId,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
    });

    res.status(201).json({
      data: registration,
    });
  } catch (error: unknown) {
    if (error instanceof RegistrationError) {
      if (error.code === "EVENT_NOT_FOUND") {
        res.status(404).json({
          error: "Event not found",
        });
        return;
      }

      if (error.code === "EVENT_FULL") {
        res.status(409).json({
          error: "Event is full",
        });
        return;
      }

      if (error.code === "ALREADY_REGISTERED") {
        res.status(409).json({
          error: "Attendee is already registered for this event",
        });
        return;
      }
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

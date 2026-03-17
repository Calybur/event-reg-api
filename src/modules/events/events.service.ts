import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import type { EventWithAttendeeCount } from "./events.types";

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateTicketCode = (): string => {
  let code = "TCK-";

  for (let i = 0; i < 8; i += 1) {
    code += TICKET_ALPHABET[randomInt(0, TICKET_ALPHABET.length)];
  }

  return code;
};

type RegisterAttendeeInput = {
  eventId: number;
  email: string;
  name: string;
};

export type RegisterAttendeeResult = {
  eventId: number;
  email: string;
  name: string;
  ticketCode: string;
};

export class RegistrationError extends Error {
  constructor(
    public readonly code: "EVENT_NOT_FOUND" | "EVENT_FULL" | "ALREADY_REGISTERED",
  ) {
    super(code);
  }
}

export const listUpcomingEvents = async (): Promise<EventWithAttendeeCount[]> => {
  const now = new Date();

  const events = await prisma.event.findMany({
    where: {
      startDate: {
        gt: now,
      },
    },
    orderBy: {
      startDate: "asc",
    },
    include: {
      _count: {
        select: {
          attendees: true,
        },
      },
    },
  });

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    capacity: event.capacity,
    attendeeCount: event._count.attendees,
  }));
};

export const registerAttendeeForEvent = async (
  input: RegisterAttendeeInput,
): Promise<RegisterAttendeeResult> => {
  return prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<Array<{ id: number; capacity: number }>>`
      SELECT id, capacity
      FROM events
      WHERE id = ${input.eventId}
      FOR UPDATE
    `;

    const lockedEvent = lockedRows[0];
    if (!lockedEvent) {
      throw new RegistrationError("EVENT_NOT_FOUND");
    }

    const attendeeCount = await tx.attendee.count({
      where: { eventId: input.eventId },
    });

    if (attendeeCount >= lockedEvent.capacity) {
      logger.warn(
        {
          eventId: input.eventId,
          capacity: lockedEvent.capacity,
          attendeeCount,
        },
        "Event is already full, registration rejected",
      );
      throw new RegistrationError("EVENT_FULL");
    }

    const existingRegistration = await tx.attendee.findUnique({
      where: {
        eventId_email: {
          eventId: input.eventId,
          email: input.email,
        },
      },
    });

    if (existingRegistration) {
      throw new RegistrationError("ALREADY_REGISTERED");
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const createdAttendee = await tx.attendee.create({
          data: {
            eventId: input.eventId,
            email: input.email,
            name: input.name,
            ticketCode: generateTicketCode(),
          },
        });

        return {
          eventId: createdAttendee.eventId,
          email: createdAttendee.email,
          name: createdAttendee.name,
          ticketCode: createdAttendee.ticketCode,
        };
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Could not generate unique ticket code");
  });
};

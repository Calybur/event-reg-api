import { Prisma } from "@prisma/client";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import {
  type RegisterAttendeeInput,
  type RegisterAttendeeResult,
  RegistrationError,
} from "./events.registration";
import type { EventWithAttendeeCount } from "./events.types";
import { generateTicketCode, maskEmail } from "./events.utils";

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
      logger.warn(
        {
          eventId: input.eventId,
        },
        "Registration rejected: event not found",
      );
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
      logger.info(
        {
          eventId: input.eventId,
          emailMasked: maskEmail(input.email),
        },
        "Registration rejected: attendee already registered",
      );
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

        logger.info(
          {
            eventId: createdAttendee.eventId,
            attendeeId: createdAttendee.id,
            emailMasked: maskEmail(createdAttendee.email),
            ticketSuffix: createdAttendee.ticketCode.slice(-4),
          },
          "Registration completed",
        );

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
          logger.warn(
            {
              eventId: input.eventId,
            },
            "Ticket code collision detected, retrying",
          );
          continue;
        }

        throw error;
      }
    }

    throw new Error("Could not generate unique ticket code");
  });
};

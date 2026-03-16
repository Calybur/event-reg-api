import { prisma } from "../../lib/prisma";
import type { EventWithAttendeeCount } from "./events.types";

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

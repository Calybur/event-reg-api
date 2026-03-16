import type { EventWithAttendeeCount } from "./events.types";

export type EventListItemDto = {
  id: number;
  name: string;
  startDate: string;
  capacity: number;
  availableSeats: number;
};

export const toEventListItemDto = (event: EventWithAttendeeCount): EventListItemDto => ({
  id: event.id,
  name: event.name,
  startDate: event.startDate.toISOString(),
  capacity: event.capacity,
  availableSeats: Math.max(event.capacity - event.attendeeCount, 0),
});

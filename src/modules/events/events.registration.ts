export type RegistrationErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_FULL"
  | "ALREADY_REGISTERED";

export type RegisterAttendeeInput = {
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
  constructor(public readonly code: RegistrationErrorCode) {
    super(code);
  }
}

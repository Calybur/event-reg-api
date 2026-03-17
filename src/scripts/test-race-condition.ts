import "dotenv/config";
import { prisma } from "../lib/prisma";

type RegisterResult = {
  label: string;
  status: number;
  body: unknown;
};

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const eventId = Number(process.env.RACE_EVENT_ID ?? 1);

const postRegistration = async (label: string, email: string): Promise<RegisterResult> => {
  const response = await fetch(`${baseUrl}/api/events/${eventId}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      name: label,
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    label,
    status: response.status,
    body,
  };
};

const run = async (): Promise<void> => {
  if (!Number.isInteger(eventId) || eventId <= 0) {
    throw new Error("RACE_EVENT_ID must be a positive integer");
  }

  await prisma.$executeRawUnsafe(
    `UPDATE events SET capacity = 1 WHERE id = ${eventId}; DELETE FROM attendees WHERE event_id = ${eventId};`,
  );

  const timestamp = Date.now();
  const req1 = postRegistration("Race Test A", `race-a-${timestamp}@example.com`);
  const req2 = postRegistration("Race Test B", `race-b-${timestamp}@example.com`);

  const results = await Promise.all([req1, req2]);

  const attendeeCount = await prisma.attendee.count({
    where: {
      eventId,
    },
  });

  const successCount = results.filter((r) => r.status === 201).length;
  const conflictCount = results.filter((r) => r.status === 409).length;

  console.log("Race test results");
  console.log(JSON.stringify({ eventId, results, attendeeCount }, null, 2));

  const pass = successCount === 1 && conflictCount === 1 && attendeeCount === 1;

  if (!pass) {
    throw new Error(
      "Race test failed: expected exactly one 201, one 409, and one attendee row",
    );
  }

  console.log("Race test PASS");
};

run()
  .catch((error: unknown) => {
    console.error("Race test failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

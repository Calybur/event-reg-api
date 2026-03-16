
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendees" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendees_ticket_code_key" ON "attendees"("ticket_code");


CREATE INDEX "attendees_event_id_idx" ON "attendees"("event_id");

CREATE UNIQUE INDEX "attendees_event_id_email_key" ON "attendees"("event_id", "email");


ALTER TABLE "attendees" ADD CONSTRAINT "attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

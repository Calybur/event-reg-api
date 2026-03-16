import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";

type DummyPost = {
  id: number;
  title: string;
  views: number;
};

type DummyEventsPayload = {
  posts: DummyPost[];
};

const normalizeCapacity = (views: number): number => {
  const mapped = Math.floor(views / 30);
  return Math.min(Math.max(mapped, 30), 200);
};

const buildStartDate = (index: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + index + 1);
  date.setHours(10, 0, 0, 0);
  return date;
};

const run = async (): Promise<void> => {
  const filePath = path.resolve(process.cwd(), "dummy-events.json");
  const fileBuffer = await readFile(filePath);
  const isUtf16Le = fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe;
  const rawContent = isUtf16Le
    ? fileBuffer.toString("utf16le")
    : fileBuffer.toString("utf8");
  const fileContent = rawContent.replace(/^\uFEFF/, "");
  const payload = JSON.parse(fileContent) as DummyEventsPayload;

  if (!Array.isArray(payload.posts) || payload.posts.length === 0) {
    throw new Error("dummy-events.json does not contain any posts");
  }

  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE attendees, events RESTART IDENTITY CASCADE",
  );

  const data = payload.posts.map((post, index) => ({
    name: post.title.trim(),
    startDate: buildStartDate(index),
    capacity: normalizeCapacity(post.views),
  }));

  await prisma.event.createMany({ data });

  console.log(`Seed completed: inserted ${data.length} events from dummy-events.json`);
};

run()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { z } from "zod";

export const registerEventParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const registerEventBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(100),
});

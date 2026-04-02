import { db } from "#/db";
import { locations, subscribers } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/servers/auth";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { count, eq } from "drizzle-orm";

const getSubscribersInputValidator = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
  page: z.number().int().min(1).optional()
});

/**
 * [Requires authentication]
 * Fetches a paginated list of PPPoE subscribers from the database.
 */
export const getSubscribers = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSubscribersInputValidator))
  .handler(async ({ data }) => {
    await ensureSession();

    return db.query.subscribers.findMany({
      with: { gponPort: { with: { location: true } }, odpPoint: true },
      limit: data.limit ?? 999999
    });
  });

export const getLocations = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSession();

  return db
    .select({ id: locations.id, name: locations.name, type: locations.type })
    .from(locations)
    .all();
});

export const getActiveSubscribersCount = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSession();

  const [activeCount] = await db
    .select({ count: count() })
    .from(subscribers)
    .where(eq(subscribers.enabled, true));

  return { count: activeCount.count };
});

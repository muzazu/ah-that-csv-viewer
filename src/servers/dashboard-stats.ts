import { db } from "#/db";
import { appSettings, locations, subscribers, user } from "#/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { count, eq } from "drizzle-orm";

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const [subscriberCount] = await db.select({ count: count() }).from(subscribers);
  const [locationCount] = await db.select({ count: count() }).from(locations);
  const [activeCount] = await db
    .select({ count: count() })
    .from(subscribers)
    .where(eq(subscribers.enabled, true));
  const settings = await db.select().from(appSettings).limit(1);
  const [userCount] = await db.select({ count: count() }).from(user);

  return {
    subscriberCount: Number(subscriberCount?.count ?? 0),
    locationCount: Number(locationCount?.count ?? 0),
    activeCount: Number(activeCount?.count ?? 0),
    userCount: Number(userCount?.count ?? 0),
    appName: settings[0]?.appName ?? "My App"
  };
});

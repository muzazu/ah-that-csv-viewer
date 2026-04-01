import { db } from "#/db";
import { locations, subscribers, gponPorts, odpPoints } from "#/db/schema";
import { locationSchema } from "#/lib/schemas";
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { eq, inArray, or } from "drizzle-orm";
import z from "zod";

const idSchema = z.object({ id: z.number().int().positive() });

export const getLocations = createServerFn({ method: "GET" }).handler(async () => {
  return db.select().from(locations).orderBy(locations.name);
});

export const createLocation = createServerFn({ method: "POST" })
  .inputValidator(locationSchema)
  .handler(async ({ data }) => {
    await db.insert(locations).values({
      name: data.name,
      type: data.type,
      address: data.address || null,
      notes: data.notes || null
    });
  });

export const removeLocation = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(idSchema))
  .handler(async ({ data }) => {
    await db.delete(locations).where(eq(locations.id, data.id));
  });

export const checkLocationInUse = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(idSchema))
  .handler(async ({ data }) => {
    const [portRows, odpRows] = await Promise.all([
      db
        .select({ id: gponPorts.id })
        .from(gponPorts)
        .where(eq(gponPorts.locationId, data.id))
        .all(),
      db.select({ id: odpPoints.id }).from(odpPoints).where(eq(odpPoints.locationId, data.id)).all()
    ]);

    const portIds = portRows.map((r) => r.id);
    const odpIds = odpRows.map((r) => r.id);

    if (portIds.length === 0 && odpIds.length === 0) return { count: 0 };

    const conditions = [
      portIds.length > 0 ? inArray(subscribers.gponPortId, portIds) : undefined,
      odpIds.length > 0 ? inArray(subscribers.odpPointId, odpIds) : undefined
    ].filter(Boolean) as Parameters<typeof or>;

    const count = await db.$count(subscribers, or(...conditions));
    return { count };
  });

export const getLocationDetail = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(idSchema))
  .handler(async ({ data }) => {
    const location = await db.query.locations.findFirst({
      where: eq(locations.id, data.id),
      with: { gponPorts: true, odpPoints: true }
    });

    if (!location) return null;
    return location;
  });

export const updateLocationDetail = createServerFn({ method: "POST" })
  .inputValidator(
    zodValidator(
      z.object({
        id: z.number().int().positive(),
        data: locationSchema
      })
    )
  )
  .handler(async ({ data }) => {
    await db
      .update(locations)
      .set({
        name: data.data.name,
        type: data.data.type,
        address: data.data.address || null,
        notes: data.data.notes || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(locations.id, data.id));
  });

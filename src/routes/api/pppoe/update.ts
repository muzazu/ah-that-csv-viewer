import { ensureSession } from "#/servers/auth";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const updateSubscriberSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  pppoeUsername: z.string().min(1),
  location: z.string().optional(),
  gponPort: z.string().optional(),
  odpPoint: z.string().optional(),
  ipAddress: z.string().optional(),
  serialNumber: z.string().optional(),
  sn2: z.string().optional(),
  sn3: z.string().optional(),
  notes: z.string().optional(),
  enabled: z.boolean()
});

export const Route = createFileRoute("/api/pppoe/update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await ensureSession();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const parsed = updateSubscriberSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const data = parsed.data;

        const { db } = await import("#/db");
        const { subscribers, locations } = await import("#/db/schema");
        const { eq } = await import("drizzle-orm");
        const { findOrCreateLocation, findOrCreateGponPort, findOrCreateOdpPoint } =
          await import("#/lib/subscriber-helpers");

        const locationCache = new Map<string, number>();
        const gponPortCache = new Map<string, number>();
        const odpPointCache = new Map<string, number>();

        const knownLocations = db
          .select({ id: locations.id, name: locations.name })
          .from(locations)
          .all();

        let locationId: number | null = null;
        if (data.location?.trim()) {
          locationId = findOrCreateLocation(data.location, locationCache, knownLocations);
        }

        let gponPortId: number | null = null;
        if (data.gponPort?.trim()) {
          const resolvedLocationId =
            locationId ??
            findOrCreateLocation(
              `Unknown Location (${data.gponPort.trim()})`,
              locationCache,
              knownLocations
            );
          gponPortId = findOrCreateGponPort(data.gponPort, resolvedLocationId, gponPortCache);
        }

        let odpPointId: number | null = null;
        if (data.odpPoint?.trim()) {
          odpPointId = findOrCreateOdpPoint(data.odpPoint, locationId, odpPointCache);
        }

        const extra: Record<string, string> = {};
        if (data.sn2?.trim()) extra.sn2 = data.sn2.trim();
        if (data.sn3?.trim()) extra.sn3 = data.sn3.trim();
        if (data.notes?.trim()) extra.notes = data.notes.trim();
        const extraFields = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

        db.update(subscribers)
          .set({
            name: data.name.trim(),
            pppoeUsername: data.pppoeUsername.trim(),
            gponPortId,
            odpPointId,
            ipAddress: data.ipAddress?.trim() || null,
            serialNumber: data.serialNumber?.trim() || null,
            extraFields,
            enabled: data.enabled,
            updatedAt: new Date().toISOString()
          })
          .where(eq(subscribers.id, data.id))
          .run();

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});

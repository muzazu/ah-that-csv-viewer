import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/db";
import { locations, subscribers } from "#/db/schema";
import { inArray } from "drizzle-orm";
import { importChunkSchema } from "#/lib/schemas";
import type {
  LocationRecord,
  LocationCache,
  GponPortCache,
  OdpPointCache
} from "#/lib/subscriber-helpers";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/pppoe/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const parsed = importChunkSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const { rows } = parsed.data;

        const { findOrCreateLocation, findOrCreateGponPort, findOrCreateOdpPoint } =
          await import("#/lib/subscriber-helpers");

        const locationCache: LocationCache = new Map();
        const gponPortCache: GponPortCache = new Map();
        const odpPointCache: OdpPointCache = new Map();

        // Preload all existing locations for similarity matching
        const knownLocations: LocationRecord[] = db
          .select({ id: locations.id, name: locations.name })
          .from(locations)
          .all();

        // Detect existing usernames for duplicate tracking
        const chunkUsernames = rows.map((r) => r.pppoeUsername.trim()).filter(Boolean);
        const existingUsernameRows =
          chunkUsernames.length > 0
            ? db
                .select({ pppoeUsername: subscribers.pppoeUsername })
                .from(subscribers)
                .where(inArray(subscribers.pppoeUsername, chunkUsernames))
                .all()
            : [];
        const existingUsernames = new Set(existingUsernameRows.map((r) => r.pppoeUsername));

        let upserted = 0;
        let insertedCount = 0;
        let updatedCount = 0;
        const duplicateUsernames: string[] = [];
        const errors: { row: number; message: string }[] = [];

        // Run all inserts inside a single transaction for performance
        db.transaction(() => {
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]!;
            try {
              // ── Resolve FK IDs ─────────────────────────────────────────
              let locationId: number | null = null;
              if (row.location?.trim()) {
                locationId = findOrCreateLocation(row.location, locationCache, knownLocations);
              }

              let gponPortId: number | null = null;
              if (row.gponPort?.trim()) {
                // GPON port needs a location; create a generic one if missing
                const resolvedLocationId =
                  locationId ??
                  findOrCreateLocation(
                    `Unknown Location (${row.gponPort.trim()})`,
                    locationCache,
                    knownLocations
                  );
                gponPortId = findOrCreateGponPort(row.gponPort, resolvedLocationId, gponPortCache);
              }

              let odpPointId: number | null = null;
              if (row.odpPoint?.trim()) {
                odpPointId = findOrCreateOdpPoint(row.odpPoint, locationId, odpPointCache);
              }

              // ── Build extraFields ──────────────────────────────────────
              const extra: Record<string, string> = {};
              if (row.sn2?.trim()) extra.sn2 = row.sn2.trim();
              if (row.sn3?.trim()) extra.sn3 = row.sn3.trim();
              if (row.notes?.trim()) extra.notes = row.notes.trim();
              const extraFields = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

              const username = row.pppoeUsername.trim();
              const isDuplicate = existingUsernames.has(username);

              // ── Upsert subscriber ──────────────────────────────────────
              db.insert(subscribers)
                .values({
                  name: row.name.trim(),
                  pppoeUsername: username,
                  gponPortId,
                  odpPointId,
                  ipAddress: row.ipAddress?.trim() || null,
                  serialNumber: row.serialNumber?.trim() || null,
                  extraFields,
                  enabled: true
                })
                .onConflictDoUpdate({
                  target: subscribers.pppoeUsername,
                  set: {
                    name: row.name.trim(),
                    gponPortId,
                    odpPointId,
                    ipAddress: row.ipAddress?.trim() || null,
                    serialNumber: row.serialNumber?.trim() || null,
                    extraFields,
                    updatedAt: new Date().toISOString()
                  }
                })
                .run();

              upserted++;
              if (isDuplicate) {
                updatedCount++;
                duplicateUsernames.push(username);
              } else {
                insertedCount++;
              }
            } catch (err) {
              errors.push({
                row: i,
                message: err instanceof Error ? err.message : String(err)
              });
            }
          }
        });

        return new Response(
          JSON.stringify({
            processed: rows.length,
            upserted,
            inserted: insertedCount,
            updated: updatedCount,
            duplicateUsernames,
            errors
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }
});

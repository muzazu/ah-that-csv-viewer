/**
 * Server-only helpers for resolving / creating subscriber FK entities.
 * Always dynamically import this file inside createServerFn handlers.
 */
import { db } from "#/db";
import { locations, gponPorts, odpPoints } from "#/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationCache = Map<string, number>;
export type GponPortCache = Map<string, number>;
export type OdpPointCache = Map<string, number>;
export type LocationRecord = { id: number; name: string };

// ─── Location type inference ──────────────────────────────────────────────────

export function inferLocationType(name: string): "OLT" | "BTS" | "POP" {
  const upper = name.toUpperCase();
  if (upper.includes("BTS")) return "BTS";
  if (upper.includes("POP")) return "POP";
  return "OLT";
}

// ─── Similarity helpers ───────────────────────────────────────────────────────

const LOCATION_STOPWORDS = new Set(["olt", "bts", "pop", "epon", "gpon"]);

function locationWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !LOCATION_STOPWORDS.has(w))
  );
}

export function wordSimilarity(a: string, b: string): number {
  const wa = locationWords(a);
  const wb = locationWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  return intersection / Math.min(wa.size, wb.size);
}

// ─── Find-or-create helpers ───────────────────────────────────────────────────

export function findOrCreateLocation(
  name: string,
  cache: LocationCache,
  knownLocations: LocationRecord[]
): number {
  const key = name.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const exact = db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.name, name.trim()))
    .get();

  if (exact) {
    cache.set(key, exact.id);
    return exact.id;
  }

  let bestId: number | null = null;
  let bestScore = 0;
  for (const loc of knownLocations) {
    const score = wordSimilarity(name, loc.name);
    if (score > bestScore) {
      bestScore = score;
      bestId = loc.id;
    }
  }
  if (bestId !== null && bestScore >= 0.5) {
    cache.set(key, bestId);
    return bestId;
  }

  const inserted = db
    .insert(locations)
    .values({ name: name.trim(), type: inferLocationType(name) })
    .returning({ id: locations.id })
    .get();

  cache.set(key, inserted.id);
  knownLocations.push({ id: inserted.id, name: name.trim() });
  return inserted.id;
}

export function findOrCreateGponPort(
  portIdentifier: string,
  locationId: number,
  cache: GponPortCache
): number {
  const key = `${locationId}:${portIdentifier.trim()}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const existing = db
    .select({ id: gponPorts.id })
    .from(gponPorts)
    .where(
      and(eq(gponPorts.locationId, locationId), eq(gponPorts.portIdentifier, portIdentifier.trim()))
    )
    .get();

  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const inserted = db
    .insert(gponPorts)
    .values({ locationId, portIdentifier: portIdentifier.trim() })
    .returning({ id: gponPorts.id })
    .get();

  cache.set(key, inserted.id);
  return inserted.id;
}

export function findOrCreateOdpPoint(
  name: string,
  locationId: number | null,
  cache: OdpPointCache
): number {
  const key = name.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const existing = db
    .select({ id: odpPoints.id })
    .from(odpPoints)
    .where(eq(odpPoints.name, name.trim()))
    .get();

  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const inserted = db
    .insert(odpPoints)
    .values({ name: name.trim(), locationId })
    .returning({ id: odpPoints.id })
    .get();

  cache.set(key, inserted.id);
  return inserted.id;
}

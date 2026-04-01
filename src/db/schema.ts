import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// User authentication tables (better-auth)

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" })
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by")
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms"
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms"
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ─── Lookup Tables (user-managed) ────────────────────────────────────────────

/**
 * locations — OLT / BTS / POP sites.
 * Users can add, edit, and delete entries here.
 */
export const locations = sqliteTable(
  "locations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type", { enum: ["OLT", "BTS", "POP"] })
      .notNull()
      .default("OLT"),
    address: text("address"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
  },
  (t) => [index("idx_locations_name").on(t.name)]
);

/**
 * gpon_ports — GPON port identifiers per location (e.g. "1/2/1:61").
 * Users can add, edit, and delete entries here.
 */
export const gponPorts = sqliteTable(
  "gpon_ports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    locationId: integer("location_id").references(() => locations.id, {
      onDelete: "set null"
    }),
    portIdentifier: text("port_identifier").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
  },
  (t) => [
    index("idx_gpon_ports_location").on(t.locationId),
    uniqueIndex("uq_gpon_ports_location_port").on(t.locationId, t.portIdentifier)
  ]
);

/**
 * odp_points — last-mile ODP distribution points (e.g. "ODP 1 Rumah Ikbal").
 * Users can add, edit, and delete entries here.
 */
export const odpPoints = sqliteTable(
  "odp_points",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    locationId: integer("location_id").references(() => locations.id, {
      onDelete: "set null"
    }),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
  },
  (t) => [
    index("idx_odp_points_name").on(t.name),
    index("idx_odp_points_location").on(t.locationId)
  ]
);

/**
 * field_definitions — configures the extra JSON fields on subscribers.
 * Each record describes one key inside the `extra_fields` JSON column.
 * Users can add, edit, reorder, and delete these definitions.
 * Default seeds: serial_number_2, onu_type.
 */
export const fieldDefinitions = sqliteTable(
  "field_definitions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    fieldType: text("field_type", { enum: ["text", "number", "boolean"] })
      .notNull()
      .default("text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
  },
  (t) => [uniqueIndex("uq_field_definitions_key").on(t.key)]
);

// ─── Main Table ───────────────────────────────────────────────────────────────

/**
 * subscribers — one row per ISP subscriber imported from CSV.
 *
 * CSV import rules:
 *  - Column 0 (TJS…): if empty → enabled = false, otherwise → enabled = true
 *  - Columns 8 & 9   → serialized into extra_fields JSON keyed by field_definitions.key
 */
export const subscribers = sqliteTable(
  "subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Core identity
    name: text("name").notNull(),
    pppoeUsername: text("pppoe_username").notNull(),

    // Foreign keys (nullable: CSV rows may be incomplete)
    gponPortId: integer("gpon_port_id").references(() => gponPorts.id, {
      onDelete: "set null"
    }),
    odpPointId: integer("odp_point_id").references(() => odpPoints.id, {
      onDelete: "set null"
    }),

    // Network info
    ipAddress: text("ip_address"),
    serialNumber: text("serial_number"),

    // Status: 0 = disabled (no value in CSV col 0), 1 = active
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),

    /**
     * extra_fields — JSON object keyed by field_definitions.key.
     * Example: { "serial_number_2": "ZTEGC76EC4DE", "onu_type": "ONU Totolink" }
     */
    extraFields: text("extra_fields"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
  },
  (t) => [
    // Unique indexes (also serve as fast-lookup indexes)
    uniqueIndex("uq_subscribers_pppoe").on(t.pppoeUsername),
    uniqueIndex("uq_subscribers_ip").on(t.ipAddress),
    // Search/filter indexes
    index("idx_subscribers_name").on(t.name),
    index("idx_subscribers_enabled").on(t.enabled),
    index("idx_subscribers_gpon_port").on(t.gponPortId),
    index("idx_subscribers_odp_point").on(t.odpPointId)
  ]
);

// ─── App Settings ─────────────────────────────────────────────────────────────

/**
 * app_settings — single-row table for global application configuration.
 * setupCompleted = 1 means the first-time wizard has been finished.
 */
export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appName: text("app_name").notNull().default("My App"),
  logoPath: text("logo_path"),
  setupCompleted: integer("setup_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const locationsRelations = relations(locations, ({ many }) => ({
  gponPorts: many(gponPorts),
  odpPoints: many(odpPoints)
}));

export const gponPortsRelations = relations(gponPorts, ({ one, many }) => ({
  location: one(locations, {
    fields: [gponPorts.locationId],
    references: [locations.id]
  }),
  subscribers: many(subscribers)
}));

export const odpPointsRelations = relations(odpPoints, ({ one, many }) => ({
  location: one(locations, {
    fields: [odpPoints.locationId],
    references: [locations.id]
  }),
  subscribers: many(subscribers)
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
  gponPort: one(gponPorts, {
    fields: [subscribers.gponPortId],
    references: [gponPorts.id]
  }),
  odpPoint: one(odpPoints, {
    fields: [subscribers.odpPointId],
    references: [odpPoints.id]
  })
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

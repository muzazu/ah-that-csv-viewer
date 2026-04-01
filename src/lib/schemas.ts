import { z } from "zod";

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});
export type LoginValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Setup wizard — Step 1: admin credentials
// ---------------------------------------------------------------------------
export const setupStep1Schema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z
      .string()
      .optional()
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });
export type SetupStep1Values = z.infer<typeof setupStep1Schema>;

// ---------------------------------------------------------------------------
// Setup wizard — Step 2: app settings
// ---------------------------------------------------------------------------
export const setupStep2Schema = z.object({
  appName: z.string().min(1, "App name is required")
});
export type SetupStep2Values = z.infer<typeof setupStep2Schema>;

// ---------------------------------------------------------------------------
// Admin: create user
// ---------------------------------------------------------------------------
export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"])
});
export type CreateUserValues = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Admin: edit role
// ---------------------------------------------------------------------------
export const editRoleSchema = z.object({
  role: z.enum(["user", "admin"])
});
export type EditRoleValues = z.infer<typeof editRoleSchema>;

// ---------------------------------------------------------------------------
// Admin: location
// ---------------------------------------------------------------------------
export const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["OLT", "BTS", "POP"]),
  address: z.string().optional(),
  notes: z.string().optional()
});
export type LocationValues = z.infer<typeof locationSchema>;

// ---------------------------------------------------------------------------
// PPPoE bulk import
// ---------------------------------------------------------------------------
export const subscriberImportRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pppoeUsername: z.string().min(1, "PPPoE username is required"),
  location: z.string().optional(),
  gponPort: z.string().optional(),
  odpPoint: z.string().optional(),
  ipAddress: z.string().optional(),
  serialNumber: z.string().optional(),
  sn2: z.string().optional(),
  sn3: z.string().optional(),
  notes: z.string().optional()
});
export type SubscriberImportRow = z.infer<typeof subscriberImportRowSchema>;

export const importChunkSchema = z.object({
  rows: z.array(subscriberImportRowSchema).min(1),
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().min(1)
});
export type ImportChunk = z.infer<typeof importChunkSchema>;

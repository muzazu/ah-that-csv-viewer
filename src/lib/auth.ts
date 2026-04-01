import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { admin, username } from "better-auth/plugins";
import { db } from "#/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [username(), admin(), tanstackStartCookies()],
  experimental: { joins: true }
});

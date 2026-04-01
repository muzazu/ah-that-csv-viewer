import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { db } from "#/db";
import { appSettings } from "#/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const SetupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8),
  appName: z.string().min(1).max(100),
  logoPath: z.string().optional()
});

export const Route = createFileRoute("/api/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Guard: only allow if setup not yet completed
        const existing = await db.select().from(appSettings).limit(1);
        if (existing.length > 0 && existing[0].setupCompleted) {
          return new Response(JSON.stringify({ error: "Setup already completed" }), {
            status: 409,
            headers: { "Content-Type": "application/json" }
          });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const parsed = SetupSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" }
            }
          );
        }

        const { username, email, password, appName, logoPath } = parsed.data;

        // Create admin user via Better Auth
        const createRes = await auth.api.createUser({
          body: {
            name: username,
            email: email && email.length > 0 ? email : `${username}@local.invalid`,
            password,
            role: "admin",
            data: { username }
          }
        });

        if (!createRes?.user) {
          return new Response(JSON.stringify({ error: "Failed to create admin user" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Save / upsert app_settings
        if (existing.length > 0) {
          await db
            .update(appSettings)
            .set({
              appName,
              logoPath: logoPath ?? null,
              setupCompleted: true,
              updatedAt: new Date().toISOString()
            })
            .where(eq(appSettings.id, existing[0].id));
        } else {
          await db.insert(appSettings).values({
            appName,
            logoPath: logoPath ?? null,
            setupCompleted: true
          });
        }

        // Auto sign-in via username/password
        const signInRequest = new Request(new URL("/api/auth/sign-in/username", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: request.headers.get("cookie") ?? ""
          },
          body: JSON.stringify({ username, password })
        });

        const signInRes = await auth.handler(signInRequest);
        const signInBody = (await signInRes.json()) as { token?: string };

        // Forward Set-Cookie headers so the browser gets the session
        const responseCookies = signInRes.headers.get("set-cookie") ?? "";

        return new Response(
          JSON.stringify({ success: true, user: { name: username }, ...signInBody }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...(responseCookies ? { "Set-Cookie": responseCookies } : {})
            }
          }
        );
      },

      GET: async () => {
        const existing = await db.select().from(appSettings).limit(1);
        const completed = existing.length > 0 && existing[0].setupCompleted;
        return new Response(JSON.stringify({ setupCompleted: completed }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});

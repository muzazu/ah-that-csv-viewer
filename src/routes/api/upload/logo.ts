import { createFileRoute } from "@tanstack/react-router";
import path from "node:path";
import fs from "node:fs/promises";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const Route = createFileRoute("/api/upload/logo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (!ALLOWED_MIME.has(file.type)) {
          return new Response(
            JSON.stringify({ error: "Invalid file type. Allowed: PNG, JPEG, SVG, WEBP" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" }
            }
          );
        }

        if (file.size > MAX_SIZE_BYTES) {
          return new Response(JSON.stringify({ error: "File too large. Maximum 2 MB." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        // Only allow known extensions to avoid path issues
        if (!["png", "jpg", "jpeg", "svg", "webp"].includes(ext)) {
          return new Response(JSON.stringify({ error: "Invalid file extension" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const filename = `logo.${ext}`;
        const uploadsDir = path.resolve("public/uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadsDir, filename), buffer);

        return new Response(JSON.stringify({ logoPath: `/uploads/${filename}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});

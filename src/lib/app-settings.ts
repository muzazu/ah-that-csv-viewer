import { createServerFn } from "@tanstack/react-start";

export const DEFAULT_APP_NAME = "APP";
export const DEFAULT_FAVICON_PATH = "/logo.png";

export type StoredAppSettings = {
  setupCompleted: boolean;
  appName: string;
  logoPath: string | null;
};

export const getStoredAppSettings = createServerFn({ method: "GET" }).handler(async () => {
  const [{ db }, { appSettings }] = await Promise.all([import("#/db"), import("#/db/schema")]);
  const settings = await db.select().from(appSettings).limit(1);

  return {
    setupCompleted: Boolean(settings[0]?.setupCompleted),
    appName: settings[0]?.appName ?? DEFAULT_APP_NAME,
    logoPath: settings[0]?.logoPath ?? null
  } satisfies StoredAppSettings;
});

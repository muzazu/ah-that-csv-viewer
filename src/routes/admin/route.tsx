import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { Separator } from "#/components/ui/separator";
import { AppSidebar } from "#/components/admin/AppSidebar";
import { authClient } from "#/lib/auth-client";
import { getStoredAppSettings } from "#/lib/app-settings";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const data = await getStoredAppSettings();

    if (!data.setupCompleted) {
      throw redirect({ to: "/setup" });
    }

    return data;
  },
  component: AdminLayout
});

function AdminLayout() {
  const { data: session, isPending } = authClient.useSession();
  const { appName, logoPath } = Route.useLoaderData();

  // Client-side auth guard
  if (!isPending && !session?.user) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar appName={appName} logoPath={logoPath} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

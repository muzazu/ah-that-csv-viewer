import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Users, Activity } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { SubscribersTable } from "#/components/admin/pppoe/subscribers-table";
import { EditSubscriberDialog } from "#/components/admin/pppoe/edit-subscriber-dialog";
import { ImportSheet } from "#/components/admin/pppoe/import-sheet";
import type { SubscriberRow } from "#/components/admin/pppoe/columns";
import { getActiveSubscribersCount, getLocations, getSubscribers } from "#/servers/pppoe";

export const Route = createFileRoute("/admin/pppoe")({
  loader: async () => ({
    rows: await getSubscribers({ data: {} }),
    locations: await getLocations(),
    activeCount: await getActiveSubscribersCount()
  }),
  component: PPPoEPage
});

function PPPoEPage() {
  const { rows, locations, activeCount } = Route.useLoaderData();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SubscriberRow | null>(null);

  function handleImportDone() {
    setSheetOpen(false);
    void router.invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PPPoE Subscribers</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground/80" />
                <span className="font-medium">{rows.length}</span>
                <span className="text-xs text-muted-foreground/80">total</span>
              </Badge>
              <p className="text-muted-foreground/20">/</p>
              <Badge variant="outline" className="px-3 py-1 flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground/90" />
                <span className="font-medium">{activeCount.count}</span>
                <span className="text-xs text-secondary-foreground/90">active</span>
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </div>

      <SubscribersTable data={rows} onEditRow={setEditingRow} locations={locations} />

      <EditSubscriberDialog
        subscriber={editingRow}
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
        locations={locations}
      />

      <ImportSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDone={handleImportDone}
        locations={locations}
      />
    </div>
  );
}

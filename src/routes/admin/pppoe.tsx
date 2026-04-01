import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "#/components/ui/button";
import { SubscribersTable } from "#/components/admin/pppoe/subscribers-table";
import { EditSubscriberDialog } from "#/components/admin/pppoe/edit-subscriber-dialog";
import { ImportSheet } from "#/components/admin/pppoe/import-sheet";
import type { SubscriberRow } from "#/components/admin/pppoe/columns";
import { getLocations, getSubscribers } from "#/servers/pppoe";

export const Route = createFileRoute("/admin/pppoe")({
  loader: async () => ({
    rows: await getSubscribers({ data: {} }),
    locations: await getLocations()
  }),
  component: PPPoEPage
});

function PPPoEPage() {
  const { rows, locations } = Route.useLoaderData();
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
          <p className="text-muted-foreground">{rows.length} total subscribers</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="shrink-0">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </div>

      <SubscribersTable data={rows} onEditRow={setEditingRow} />

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

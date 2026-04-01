import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Upload } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";
import { SubscribersTable } from "#/components/admin/pppoe/subscribers-table";
import { EditSubscriberDialog } from "#/components/admin/pppoe/edit-subscriber-dialog";
import { ImportSheet } from "#/components/admin/pppoe/import-sheet";
import type { SubscriberRow } from "#/components/admin/pppoe/columns";

// ─── Server fn ───────────────────────────────────────────────────────────────

const getSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("#/db");
  return db.query.subscribers.findMany({
    with: { gponPort: { with: { location: true } }, odpPoint: true },
    limit: 2000
  });
});

const getLocations = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("#/db");
  const { locations } = await import("#/db/schema");
  return db
    .select({ id: locations.id, name: locations.name, type: locations.type })
    .from(locations)
    .all();
});

export const Route = createFileRoute("/admin/pppoe")({
  loader: async () => ({
    rows: await getSubscribers(),
    locations: await getLocations()
  }),
  component: PPPoEPage
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function PPPoEPage() {
  const { rows, locations } = Route.useLoaderData();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SubscriberRow | null>(null);

  const filtered = search.trim()
    ? (rows as SubscriberRow[]).filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.pppoeUsername.toLowerCase().includes(search.toLowerCase()) ||
          (r.ipAddress ?? "").includes(search)
      )
    : (rows as SubscriberRow[]);

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, username, IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <SubscribersTable data={filtered} onEditRow={setEditingRow} />

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

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "#/components/ui/table";
import { Badge } from "#/components/ui/badge";
import { Input } from "#/components/ui/input";
import { Search } from "lucide-react";

const getSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  const [{ db }] = await Promise.all([import("#/db")]);

  return db.query.subscribers.findMany({
    with: {
      gponPort: true,
      odpPoint: true
    },
    limit: 500
  });
});

type SubscriberRow = Awaited<ReturnType<typeof getSubscribers>>[number];

export const Route = createFileRoute("/admin/pppoe")({
  loader: async (): Promise<{ rows: SubscriberRow[] }> => ({ rows: await getSubscribers() }),
  component: PPPoEPage
});

function PPPoEPage() {
  const { rows } = Route.useLoaderData();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.pppoeUsername.toLowerCase().includes(search.toLowerCase()) ||
          (r.ipAddress ?? "").includes(search)
      )
    : rows;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PPPoE Subscribers</h1>
        <p className="text-muted-foreground">{rows.length} total subscribers</p>
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

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>PPPoE Username</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>GPON Port</TableHead>
              <TableHead>ODP Point</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {search ? "No results found." : "No subscribers yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-sm">{row.pppoeUsername}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {row.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.gponPort?.portIdentifier ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.odpPoint?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "secondary"}>
                      {row.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

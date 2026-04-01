import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Pencil } from "lucide-react";

// ─── Row type ─────────────────────────────────────────────────────────────────

export interface SubscriberRow {
  id: number;
  name: string;
  pppoeUsername: string;
  ipAddress: string | null;
  serialNumber: string | null;
  enabled: boolean;
  extraFields: string | null;
  gponPortId: number | null;
  odpPointId: number | null;
  createdAt: string;
  updatedAt: string;
  gponPort: {
    id: number;
    portIdentifier: string;
    locationId: number | null;
    location: { id: number; name: string } | null;
  } | null;
  odpPoint: { id: number; name: string; locationId: number | null } | null;
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const helper = createColumnHelper<SubscriberRow>();

export function buildColumns(onEdit: (row: SubscriberRow) => void) {
  return [
    helper.accessor("name", {
      header: "Name",
      enableSorting: true,
      cell: (info) => <span className="font-medium">{info.getValue()}</span>
    }),
    helper.accessor("pppoeUsername", {
      header: "PPPoE Username",
      enableSorting: true,
      filterFn: "fuzzy",
      cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>
    }),
    helper.accessor("ipAddress", {
      header: "IP Address",
      enableSorting: true,
      filterFn: "fuzzy",
      cell: (info) => (
        <span className="font-mono text-sm text-muted-foreground">{info.getValue() ?? "—"}</span>
      )
    }),
    helper.accessor((row) => row.gponPort?.portIdentifier ?? null, {
      id: "gponPort",
      header: "GPON Port",
      enableSorting: true,
      filterFn: "fuzzy",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() ?? "—"}</span>
      )
    }),
    helper.accessor((row) => row.odpPoint?.name ?? null, {
      id: "odpPoint",
      header: "ODP Point",
      enableSorting: true,
      filterFn: "fuzzy",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() ?? "—"}</span>
      )
    }),
    helper.accessor((row) => row.gponPort?.location ?? null, {
      id: "location",
      header: "Location",
      enableSorting: true,
      filterFn: "fuzzy",
      sortingFn: (a, b) => {
        const aName = a.original.gponPort?.location?.name ?? "";
        const bName = b.original.gponPort?.location?.name ?? "";
        return aName.localeCompare(bName);
      },
      cell: (info) => {
        const loc = info.getValue();
        if (!loc) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <Link
            to="/admin/locations/$id"
            params={{ id: String(loc.id) }}
            className="text-sm text-primary hover:underline"
          >
            {loc.name}
          </Link>
        );
      }
    }),
    helper.accessor("enabled", {
      header: "Status",
      enableSorting: true,
      cell: (info) => (
        <Badge variant={info.getValue() ? "default" : "secondary"}>
          {info.getValue() ? "Active" : "Disabled"}
        </Badge>
      ),
      enableColumnFilter: true
    }),
    helper.display({
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(row.original)}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
      )
    })
  ];
}

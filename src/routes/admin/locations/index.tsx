import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { locationSchema, type LocationValues } from "#/lib/schemas";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Badge } from "#/components/ui/badge";
import { Textarea } from "#/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "#/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "#/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "#/components/ui/select";
import { MoreHorizontal, Plus, Loader2, Trash2, Pencil, Search, AlertTriangle } from "lucide-react";

import {
  getLocations,
  createLocation,
  updateLocationDetail as updateLocation,
  removeLocation,
  checkLocationInUse
} from "#/servers/locations";

type Location = Awaited<ReturnType<typeof getLocations>>[number];

export const Route = createFileRoute("/admin/locations/")({
  loader: async (): Promise<{ rows: Location[] }> => ({ rows: await getLocations() }),
  component: LocationsPage
});

const PAGE_SIZE = 20;

function LocationsPage() {
  const fetchLocations = useServerFn(getLocations);
  const checkUsageFn = useServerFn(checkLocationInUse);
  const createLocationMutation = useServerFn(createLocation);
  const updateLocationMutation = useServerFn(updateLocation);
  const deleteLocationMutation = useServerFn(removeLocation);
  const { rows: initialRows } = Route.useLoaderData();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);
  const [deleteUsageCount, setDeleteUsageCount] = useState<number | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Reset to page 0 when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  const filteredRows = search.trim()
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase().trim()))
    : rows;

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleDeleteClick(loc: Location) {
    setDeleteLocation(loc);
    setDeleteUsageCount(null);
    setCheckingUsage(true);
    try {
      const result = await checkUsageFn({ data: { id: loc.id } });
      setDeleteUsageCount(result.count);
    } finally {
      setCheckingUsage(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: LocationValues) => {
      await createLocationMutation({ data });
    },
    onSuccess: async () => {
      setRows(await fetchLocations());
      setShowCreate(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationValues }) => {
      await updateLocationMutation({ data: { id, data } });
    },
    onSuccess: async () => {
      setRows(await fetchLocations());
      setEditLocation(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteLocationMutation({ data: { id } });
    },
    onSuccess: async () => {
      setRows(await fetchLocations());
      setDeleteLocation(null);
      setDeleteUsageCount(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage OLT, BTS, and POP sites.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search ? "No locations match your search." : "No locations yet."}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">
                    <Link to={`/admin/locations/$id`} params={{ id: loc.id.toString() }}>
                      {loc.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{loc.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {loc.address ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-48 truncate">
                    {loc.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditLocation(loc)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => void handleDeleteClick(loc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of{" "}
            {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pageCount - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <LocationFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Add Location"
        description="Create a new OLT/BTS/POP site."
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        error={createMutation.error?.message ?? null}
      />

      {editLocation && (
        <LocationFormDialog
          open={true}
          onOpenChange={(open) => !open && setEditLocation(null)}
          title="Edit Location"
          description={`Edit details for ${editLocation.name}.`}
          defaultValues={editLocation}
          onSubmit={(data) => updateMutation.mutate({ id: editLocation.id, data })}
          isPending={updateMutation.isPending}
          error={updateMutation.error?.message ?? null}
        />
      )}

      {deleteLocation && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteLocation(null);
              setDeleteUsageCount(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Location</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deleteLocation.name}</strong>? This cannot
                be undone.
              </DialogDescription>
            </DialogHeader>

            {/* Usage warning */}
            {checkingUsage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking usage…
              </div>
            )}
            {!checkingUsage && deleteUsageCount !== null && deleteUsageCount > 0 && (
              <div className="flex gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This location is linked to{" "}
                  <strong>
                    {deleteUsageCount} subscriber{deleteUsageCount !== 1 ? "s" : ""}
                  </strong>
                  . Deleting it will unlink those subscribers from this location.
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteLocation(null);
                  setDeleteUsageCount(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteLocation.id)}
                disabled={deleteMutation.isPending || checkingUsage}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LocationFormDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultValues,
  onSubmit,
  isPending,
  error
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  defaultValues?: Location;
  onSubmit: (data: LocationValues) => void;
  isPending: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: (defaultValues?.type as "OLT" | "BTS" | "POP") ?? "OLT",
      address: defaultValues?.address ?? "",
      notes: defaultValues?.notes ?? ""
    }
  });

  useEffect(() => {
    reset({
      name: defaultValues?.name ?? "",
      type: (defaultValues?.type as "OLT" | "BTS" | "POP") ?? "OLT",
      address: defaultValues?.address ?? "",
      notes: defaultValues?.notes ?? ""
    });
  }, [defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="loc-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="loc-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-type">Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="loc-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OLT">OLT</SelectItem>
                    <SelectItem value="BTS">BTS</SelectItem>
                    <SelectItem value="POP">POP</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-address">Address</Label>
            <Input id="loc-address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-notes">Notes</Label>
            <Textarea id="loc-notes" rows={3} {...register("notes")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

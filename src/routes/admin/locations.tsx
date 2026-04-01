import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { locationSchema, type LocationValues } from "#/lib/schemas";
import { z } from "zod";
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
import { MoreHorizontal, Plus, Loader2, Trash2, Pencil } from "lucide-react";

const updateLocationInputSchema = z.object({
  id: z.number().int().positive(),
  data: locationSchema
});

const deleteLocationInputSchema = z.object({
  id: z.number().int().positive()
});

const getLocations = createServerFn({ method: "GET" }).handler(async () => {
  const [{ db }, { locations }] = await Promise.all([import("#/db"), import("#/db/schema")]);
  return db.select().from(locations).orderBy(locations.name);
});

const createLocation = createServerFn({ method: "POST" })
  .inputValidator(locationSchema)
  .handler(async ({ data }) => {
    const [{ db }, { locations }] = await Promise.all([import("#/db"), import("#/db/schema")]);

    await db.insert(locations).values({
      name: data.name,
      type: data.type,
      address: data.address || null,
      notes: data.notes || null
    });
  });

const updateLocation = createServerFn({ method: "POST" })
  .inputValidator(updateLocationInputSchema)
  .handler(async ({ data }) => {
    const [{ db }, { locations }, { eq }] = await Promise.all([
      import("#/db"),
      import("#/db/schema"),
      import("drizzle-orm")
    ]);

    await db
      .update(locations)
      .set({
        name: data.data.name,
        type: data.data.type,
        address: data.data.address || null,
        notes: data.data.notes || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(locations.id, data.id));
  });

const removeLocation = createServerFn({ method: "POST" })
  .inputValidator(deleteLocationInputSchema)
  .handler(async ({ data }) => {
    const [{ db }, { locations }, { eq }] = await Promise.all([
      import("#/db"),
      import("#/db/schema"),
      import("drizzle-orm")
    ]);

    await db.delete(locations).where(eq(locations.id, data.id));
  });

type Location = Awaited<ReturnType<typeof getLocations>>[number];

export const Route = createFileRoute("/admin/locations")({
  loader: async (): Promise<{ rows: Location[] }> => ({ rows: await getLocations() }),
  component: LocationsPage
});

function LocationsPage() {
  const fetchLocations = useServerFn(getLocations);
  const createLocationMutation = useServerFn(createLocation);
  const updateLocationMutation = useServerFn(updateLocation);
  const deleteLocationMutation = useServerFn(removeLocation);
  const { rows: initialRows } = Route.useLoaderData();
  const [rows, setRows] = useState(initialRows);
  const [showCreate, setShowCreate] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No locations yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
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
                          onClick={() => setDeleteLocation(loc)}
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
        <Dialog open={true} onOpenChange={(open) => !open && setDeleteLocation(null)}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Delete Location</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deleteLocation.name}</strong>? This cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setDeleteLocation(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteLocation.id)}
                disabled={deleteMutation.isPending}
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

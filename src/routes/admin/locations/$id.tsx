import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { locationSchema, type LocationValues } from "#/lib/schemas";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Badge } from "#/components/ui/badge";
import { Textarea } from "#/components/ui/textarea";
import { Separator } from "#/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "#/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "#/components/ui/card";
import { getLocationDetail, updateLocationDetail } from "#/servers/locations";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin/locations/$id")({
  loader: async ({ params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id) || id <= 0) throw notFound();
    const req = await getLocationDetail({ data: { id } });

    if (!req) throw notFound();

    return req;
  },
  component: LocationDetailPage
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function LocationDetailPage() {
  const initialLocation = Route.useLoaderData();
  const router = useRouter();
  const updateFn = useServerFn(updateLocationDetail);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty }
  } = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: initialLocation.name,
      type: initialLocation.type as "OLT" | "BTS" | "POP",
      address: initialLocation.address ?? "",
      notes: initialLocation.notes ?? ""
    }
  });

  useEffect(() => {
    reset({
      name: initialLocation.name,
      type: initialLocation.type as "OLT" | "BTS" | "POP",
      address: initialLocation.address ?? "",
      notes: initialLocation.notes ?? ""
    });
  }, [initialLocation, reset]);

  const updateMutation = useMutation({
    mutationFn: async (values: LocationValues) => {
      await updateFn({ data: { id: initialLocation.id, data: values } });
    },
    onSuccess: async (_, values) => {
      reset(values);
      await router.invalidate();
    }
  });

  return (
    <div className="space-y-6 max-w-xl w-full mx-auto">
      <Link
        to="/admin/locations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Locations
      </Link>
      <Card>
        <CardContent>
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{initialLocation.name}</h1>
              <Badge variant="outline">{initialLocation.type}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {initialLocation.gponPorts.length} GPON Port
              {initialLocation.gponPorts.length !== 1 ? "s" : ""} &middot;{" "}
              {initialLocation.odpPoints.length} ODP Point
              {initialLocation.odpPoints.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Separator className="mt-4 mb-6!" />

          {/* Edit form */}
          <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
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

            {updateMutation.error && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}

            {updateMutation.isSuccess && !isDirty && (
              <p className="text-sm text-green-600">Changes saved.</p>
            )}

            <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

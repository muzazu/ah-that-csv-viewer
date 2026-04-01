import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Button } from "#/components/ui/button";
import { Switch } from "#/components/ui/switch";
import { LocationCombobox } from "./location-combobox";
import type { LocationOption } from "./location-combobox";
import type { SubscriberRow } from "./columns";

interface EditForm {
  name: string;
  pppoeUsername: string;
  location: string;
  gponPort: string;
  odpPoint: string;
  ipAddress: string;
  serialNumber: string;
  sn2: string;
  sn3: string;
  notes: string;
  enabled: boolean;
}

function parseExtra(extraFields: string | null): { sn2: string; sn3: string; notes: string } {
  if (!extraFields) return { sn2: "", sn3: "", notes: "" };
  try {
    const obj = JSON.parse(extraFields) as Record<string, string>;
    return {
      sn2: obj.sn2 ?? "",
      sn3: obj.sn3 ?? "",
      notes: obj.notes ?? ""
    };
  } catch {
    return { sn2: "", sn3: "", notes: "" };
  }
}

export function EditSubscriberDialog({
  subscriber,
  open,
  onOpenChange,
  locations
}: {
  subscriber: SubscriberRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationOption[];
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting, errors }
  } = useForm<EditForm>();

  // Reset form whenever the target subscriber changes
  useEffect(() => {
    if (!subscriber) return;
    const extra = parseExtra(subscriber.extraFields);
    reset({
      name: subscriber.name,
      pppoeUsername: subscriber.pppoeUsername,
      location: "",
      gponPort: subscriber.gponPort?.portIdentifier ?? "",
      odpPoint: subscriber.odpPoint?.name ?? "",
      ipAddress: subscriber.ipAddress ?? "",
      serialNumber: subscriber.serialNumber ?? "",
      sn2: extra.sn2,
      sn3: extra.sn3,
      notes: extra.notes,
      enabled: subscriber.enabled
    });
  }, [subscriber, reset]);

  async function onSubmit(values: EditForm) {
    if (!subscriber) return;
    const res = await fetch("/api/pppoe/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subscriber.id, ...values })
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError("root", { message: body.error ?? `HTTP ${res.status}` });
      return;
    }
    onOpenChange(false);
    void router.invalidate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Edit Subscriber</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="e-name" {...register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-pppoe">
                PPPoE Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="e-pppoe"
                {...register("pppoeUsername", { required: true })}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <LocationCombobox
                    value={field.value}
                    onValueChange={field.onChange}
                    locations={locations}
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-gpon">GPON Port</Label>
              <Input
                id="e-gpon"
                {...register("gponPort")}
                placeholder="e.g. 1/2/1:61"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-odp">ODP Point</Label>
              <Input id="e-odp" {...register("odpPoint")} placeholder="e.g. ODP 1 Depan Kantor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-ip">IP Address</Label>
              <Input
                id="e-ip"
                {...register("ipAddress")}
                placeholder="e.g. 10.77.77.21"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-sn">Serial Number</Label>
              <Input id="e-sn" {...register("serialNumber")} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-sn2">SN 2</Label>
              <Input id="e-sn2" {...register("sn2")} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-sn3">SN 3</Label>
              <Input id="e-sn3" {...register("sn3")} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-notes">Notes</Label>
              <Input id="e-notes" {...register("notes")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Switch id="e-enabled" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="e-enabled" className="cursor-pointer">
              Active subscriber
            </Label>
          </div>

          {errors.root && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errors.root.message}
            </div>
          )}

          {/* root success is handled by closing the dialog */}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

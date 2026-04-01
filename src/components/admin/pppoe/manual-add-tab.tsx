import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";
import { LocationCombobox } from "./location-combobox";
import type { LocationOption } from "./location-combobox";
import type { SubscriberImportRow } from "#/lib/schemas";
import { useForm, Controller, useWatch } from "react-hook-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";

interface ManualForm {
  name: string;
  pppoeUsername: string;
  location: LocationOption | null;
  gponPort: string;
  odpPoint: string;
  ipAddress: string;
  serialNumber: string;
  notes: string;
}

const EMPTY_FORM: ManualForm = {
  name: "",
  pppoeUsername: "",
  location: { id: -1, name: "", type: "OLT" },
  gponPort: "",
  odpPoint: "",
  ipAddress: "",
  serialNumber: "",
  notes: ""
};

export function ManualAddTab({
  onDone,
  locations
}: {
  onDone: () => void;
  locations: LocationOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { control, handleSubmit, reset } = useForm<ManualForm>({
    defaultValues: EMPTY_FORM
  });

  const watchedName = useWatch({ control, name: "name" });
  const watchedPppoe = useWatch({ control, name: "pppoeUsername" });

  async function onSubmit(values: ManualForm) {
    if (!values.name.trim() || !values.pppoeUsername.trim()) return;
    setSubmitting(true);
    setResult(null);

    const row: SubscriberImportRow = {
      name: values.name.trim(),
      pppoeUsername: values.pppoeUsername.trim(),
      location: values.location?.name?.trim() || undefined,
      gponPort: values.gponPort.trim() || undefined,
      odpPoint: values.odpPoint.trim() || undefined,
      ipAddress: values.ipAddress.trim() || undefined,
      serialNumber: values.serialNumber.trim() || undefined,
      notes: values.notes.trim() || undefined
    };

    try {
      const res = await fetch("/api/pppoe/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [row], chunkIndex: 0, totalChunks: 1 })
      });
      const data = (await res.json()) as {
        upserted?: number;
        errors?: { row: number; message: string }[];
        error?: string;
      };
      if (!res.ok || data.error) {
        setResult({ ok: false, message: data.error ?? `HTTP ${res.status}` });
      } else if (data.errors?.length) {
        setResult({ ok: false, message: data.errors[0]!.message });
      } else {
        setResult({ ok: true, message: "Subscriber saved successfully." });
        reset();
        void router.invalidate();
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-name">
                Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input {...field} id="m-name" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="pppoeUsername"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-pppoe">
                PPPoE Username <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="m-pppoe"
                aria-invalid={fieldState.invalid}
                className="font-mono"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Location</FieldLabel>
              <LocationCombobox
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v ?? { id: -1, name: "", type: "OLT" });
                }}
                locations={locations}
                allowAddNew
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="gponPort"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-gpon">GPON Port</FieldLabel>
              <Input {...field} id="m-gpon" placeholder="e.g. 1/2/1:61" className="font-mono" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="odpPoint"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-odp">ODP Point</FieldLabel>
              <Input {...field} id="m-odp" placeholder="e.g. ODP 1 Depan Kantor" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="ipAddress"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-ip">IP Address</FieldLabel>
              <Input {...field} id="m-ip" placeholder="e.g. 10.77.77.21" className="font-mono" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="serialNumber"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-sn">Serial Number</FieldLabel>
              <Input {...field} id="m-sn" className="font-mono" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="m-notes">Notes</FieldLabel>
              <Input {...field} id="m-notes" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {result.message}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={submitting || !watchedName?.trim() || !watchedPppoe?.trim()}
        >
          {submitting ? "Saving…" : "Add Subscriber"}
        </Button>
        {result?.ok && (
          <Button type="button" variant="outline" onClick={onDone}>
            Close
          </Button>
        )}
      </div>
    </form>
  );
}

import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Button } from "#/components/ui/button";
import { LocationCombobox } from "./location-combobox";
import type { LocationOption } from "./location-combobox";
import type { SubscriberImportRow } from "#/lib/schemas";

interface ManualForm {
  name: string;
  pppoeUsername: string;
  location: string;
  gponPort: string;
  odpPoint: string;
  ipAddress: string;
  serialNumber: string;
  notes: string;
}

const EMPTY_FORM: ManualForm = {
  name: "",
  pppoeUsername: "",
  location: "",
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
  const [form, setForm] = useState<ManualForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function setField(field: keyof ManualForm) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.pppoeUsername.trim()) return;
    setSubmitting(true);
    setResult(null);

    const row: SubscriberImportRow = {
      name: form.name.trim(),
      pppoeUsername: form.pppoeUsername.trim(),
      location: form.location.trim() || undefined,
      gponPort: form.gponPort.trim() || undefined,
      odpPoint: form.odpPoint.trim() || undefined,
      ipAddress: form.ipAddress.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      notes: form.notes.trim() || undefined
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
        setForm(EMPTY_FORM);
        // Refresh the table in the background without closing the sheet
        void router.invalidate();
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Network error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="m-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="m-name" value={form.name} onChange={setField("name")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-pppoe">
            PPPoE Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="m-pppoe"
            value={form.pppoeUsername}
            onChange={setField("pppoeUsername")}
            className="font-mono"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <LocationCombobox
            value={form.location}
            onValueChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
            locations={locations}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-gpon">GPON Port</Label>
          <Input
            id="m-gpon"
            value={form.gponPort}
            onChange={setField("gponPort")}
            placeholder="e.g. 1/2/1:61"
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-odp">ODP Point</Label>
          <Input
            id="m-odp"
            value={form.odpPoint}
            onChange={setField("odpPoint")}
            placeholder="e.g. ODP 1 Depan Kantor"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-ip">IP Address</Label>
          <Input
            id="m-ip"
            value={form.ipAddress}
            onChange={setField("ipAddress")}
            placeholder="e.g. 10.77.77.21"
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-sn">Serial Number</Label>
          <Input
            id="m-sn"
            value={form.serialNumber}
            onChange={setField("serialNumber")}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-notes">Notes</Label>
          <Input id="m-notes" value={form.notes} onChange={setField("notes")} />
        </div>
      </div>

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
          disabled={submitting || !form.name.trim() || !form.pppoeUsername.trim()}
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

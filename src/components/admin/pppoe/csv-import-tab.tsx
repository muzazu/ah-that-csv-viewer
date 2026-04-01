import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Papa from "papaparse";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "#/components/ui/select";
import type { SubscriberImportRow } from "#/lib/schemas";

// ─── CSV column → field mapping ──────────────────────────────────────────────

type FieldKey = keyof SubscriberImportRow | "skip";

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: "skip", label: "— skip —" },
  { value: "name", label: "Name" },
  { value: "pppoeUsername", label: "PPPoE Username" },
  { value: "location", label: "Location" },
  { value: "gponPort", label: "GPON Port" },
  { value: "odpPoint", label: "ODP Point" },
  { value: "ipAddress", label: "IP Address" },
  { value: "serialNumber", label: "Serial Number" },
  { value: "sn2", label: "SN 2" },
  { value: "sn3", label: "SN 3" },
  { value: "notes", label: "Notes" }
];

function autoMapHeader(header: string): FieldKey {
  const h = header.toLowerCase().trim();
  if (h === "no" || h === "#") return "skip";
  if (h === "nama" || h === "name") return "name";
  if (h.includes("user") || h.includes("pppoe")) return "pppoeUsername";
  if (h === "gpon") return "gponPort";
  if (h.includes("lokasi") || h.includes("olt") || h.includes("bts") || h.includes("pop"))
    return "location";
  if (h.includes("latmile") || h.includes("odp")) return "odpPoint";
  if (h.includes("ip")) return "ipAddress";
  if (h === "sn" || h.includes("serial")) return "serialNumber";
  return "skip";
}

function buildAutoMapping(headers: string[]): FieldKey[] {
  const used = new Set<FieldKey>();
  return headers.map((h) => {
    let mapped = autoMapHeader(h);
    if (mapped !== "skip" && used.has(mapped)) {
      if (mapped === "serialNumber") {
        if (!used.has("sn2")) mapped = "sn2";
        else if (!used.has("sn3")) mapped = "sn3";
        else mapped = "skip";
      } else {
        mapped = "skip";
      }
    }
    if (mapped !== "skip") used.add(mapped);
    return mapped;
  });
}

// ─── Import state ─────────────────────────────────────────────────────────────

type ImportStatus = "idle" | "parsing" | "running" | "done" | "error";

interface ImportProgress {
  status: ImportStatus;
  totalChunks: number;
  currentChunk: number;
  upserted: number;
  inserted: number;
  updated: number;
  errors: { chunk: number; row: number; message: string }[];
  duplicateUsernames: string[];
  startTime: number;
}

const CHUNK_SIZE = 50;

const INITIAL_PROGRESS: ImportProgress = {
  status: "idle",
  totalChunks: 0,
  currentChunk: 0,
  upserted: 0,
  inserted: 0,
  updated: 0,
  errors: [],
  duplicateUsernames: [],
  startTime: 0
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CsvImportTab({ onDone }: { onDone: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [progress, setProgress] = useState<ImportProgress>(INITIAL_PROGRESS);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [duplicatesExpanded, setDuplicatesExpanded] = useState(false);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProgress((p) => ({ ...p, status: "parsing" }));
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const rawRows = result.data as string[][];
        if (rawRows.length < 2) {
          setProgress((p) => ({ ...p, status: "idle" }));
          return;
        }
        const headers = rawRows[0]!;
        const data = rawRows.slice(1);
        const autoMapping = buildAutoMapping(headers);
        setCsvHeaders(headers);
        setCsvData(data);
        setMapping(autoMapping);
        setProgress({
          ...INITIAL_PROGRESS,
          totalChunks: Math.ceil(data.length / CHUNK_SIZE)
        });
      }
    });
  }, []);

  function buildRows(): SubscriberImportRow[] {
    return csvData
      .map((cells) => {
        const obj: Record<string, string> = {};
        mapping.forEach((field, i) => {
          if (field !== "skip" && cells[i]?.trim()) {
            obj[field] = cells[i]!.trim();
          }
        });
        return obj as SubscriberImportRow;
      })
      .filter((r) => r.name && r.pppoeUsername);
  }

  async function handleStartImport() {
    const allRows = buildRows();
    if (allRows.length === 0) return;

    const totalChunks = Math.ceil(allRows.length / CHUNK_SIZE);
    const startTime = Date.now();
    const allErrors: ImportProgress["errors"] = [];
    const allDuplicates: string[] = [];
    let totalUpserted = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    setProgress({
      status: "running",
      totalChunks,
      currentChunk: 0,
      upserted: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      duplicateUsernames: [],
      startTime
    });

    for (let ci = 0; ci < totalChunks; ci++) {
      const chunk = allRows.slice(ci * CHUNK_SIZE, (ci + 1) * CHUNK_SIZE);
      try {
        const res = await fetch("/api/pppoe/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk, chunkIndex: ci, totalChunks })
        });
        if (!res.ok) {
          const errBody = (await res.json()) as { error?: string };
          allErrors.push({ chunk: ci, row: -1, message: errBody.error ?? `HTTP ${res.status}` });
        } else {
          const data = (await res.json()) as {
            upserted: number;
            inserted: number;
            updated: number;
            duplicateUsernames: string[];
            errors: { row: number; message: string }[];
          };
          totalUpserted += data.upserted;
          totalInserted += data.inserted ?? 0;
          totalUpdated += data.updated ?? 0;
          (data.duplicateUsernames ?? []).forEach((u) => allDuplicates.push(u));
          data.errors.forEach((e) => allErrors.push({ chunk: ci, ...e }));
        }
      } catch (err) {
        allErrors.push({
          chunk: ci,
          row: -1,
          message: err instanceof Error ? err.message : "Network error"
        });
      }

      setProgress((p) => ({
        ...p,
        currentChunk: ci + 1,
        upserted: totalUpserted,
        inserted: totalInserted,
        updated: totalUpdated,
        duplicateUsernames: [...allDuplicates],
        errors: [...allErrors]
      }));
    }

    setProgress((p) => ({ ...p, status: "done" }));
  }

  const {
    status,
    totalChunks,
    currentChunk,
    upserted,
    inserted,
    updated,
    errors,
    duplicateUsernames,
    startTime
  } = progress;
  const isRunning = status === "running";
  const isDone = status === "done";
  const progressPct = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;

  let etaText = "";
  if (isRunning && currentChunk > 0) {
    const elapsed = (Date.now() - startTime) / 1000;
    const rowsDone = currentChunk * CHUNK_SIZE;
    const rowsTotal = totalChunks * CHUNK_SIZE;
    const rowsPerSec = rowsDone / elapsed;
    const remaining = (rowsTotal - rowsDone) / (rowsPerSec || 1);
    etaText = `${rowsPerSec.toFixed(0)} rows/s · ~${Math.ceil(remaining)}s remaining`;
  }

  function handleReset() {
    setCsvHeaders([]);
    setCsvData([]);
    setMapping([]);
    setProgress(INITIAL_PROGRESS);
    setErrorsExpanded(false);
    setDuplicatesExpanded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      {/* File picker */}
      <div className="space-y-2">
        <Label htmlFor="csv-file">Select CSV file</Label>
        <Input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isRunning}
        />
      </div>

      {/* Column mapping */}
      {csvHeaders.length > 0 && !isRunning && !isDone && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            Map columns{" "}
            <span className="text-muted-foreground font-normal">
              ({csvData.length} data rows detected)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {csvHeaders.map((header, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs text-muted-foreground truncate block max-w-full">
                  {header}
                </Label>
                <Select
                  value={mapping[i] ?? "skip"}
                  onValueChange={(v) =>
                    setMapping((prev) => {
                      const next = [...prev];
                      next[i] = v as FieldKey;
                      return next;
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Preview (first 5 rows)</p>
              <div className="rounded border overflow-auto text-xs">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      {csvHeaders.map((h, i) => (
                        <th
                          key={i}
                          className="px-2 py-1 text-left font-medium whitespace-nowrap max-w-30 truncate"
                        >
                          {h}
                          <span className="block text-muted-foreground font-normal">
                            → {mapping[i] === "skip" ? "skip" : mapping[i]}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 whitespace-nowrap max-w-30 truncate text-muted-foreground"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            onClick={handleStartImport}
            disabled={buildRows().length === 0}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Start Import ({buildRows().length} valid rows)
          </Button>
        </div>
      )}

      {/* Progress */}
      {(isRunning || isDone) && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{isDone ? "Import complete" : `Chunk ${currentChunk} / ${totalChunks}`}</span>
            <span className="text-muted-foreground text-xs">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {isRunning && etaText && <p className="text-xs text-muted-foreground">{etaText}</p>}

          {isDone && (
            <div className="flex items-center gap-2 text-sm">
              {errors.length === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
              )}
              <span>
                <span className="font-medium">{inserted} new</span>
                {updated > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium">{updated} updated</span>
                  </>
                )}
                {upserted !== inserted + updated && (
                  <span className="text-muted-foreground"> ({upserted} total)</span>
                )}
                {errors.length > 0 && (
                  <span className="text-destructive">
                    {" · "}
                    {errors.length} error{errors.length > 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Duplicates accordion */}
          {isDone && duplicateUsernames.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setDuplicatesExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {duplicatesExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {duplicatesExpanded ? "Hide" : "Show"} duplicates ({duplicateUsernames.length})
              </button>
              {duplicatesExpanded && (
                <ul className="mt-1 max-h-36 overflow-y-auto rounded border bg-muted/30 p-2 text-xs space-y-0.5">
                  {duplicateUsernames.map((u, i) => (
                    <li key={i} className="font-mono text-muted-foreground">
                      {u}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Errors accordion */}
          {isDone && errors.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setErrorsExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {errorsExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {errorsExpanded ? "Hide" : "Show"} errors
              </button>
              {errorsExpanded && (
                <ul className="mt-1 max-h-48 overflow-y-auto rounded border bg-muted/30 p-2 text-xs space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-destructive">
                      Chunk {e.chunk + 1}, row {e.row >= 0 ? e.row + 1 : "?"}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isDone && (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onDone}>
                Close &amp; refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Import another file
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Input } from "#/components/ui/input";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";

export interface LocationOption {
  id: number;
  name: string;
  type: "OLT" | "BTS" | "POP";
}

export function LocationCombobox({
  value,
  onValueChange,
  locations
}: {
  value: string;
  onValueChange: (v: string) => void;
  locations: LocationOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? locations.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
    : locations;

  const exactMatch = locations.some((l) => l.name.toLowerCase() === query.trim().toLowerCase());
  const showCreateOption = query.trim() && !exactMatch;

  function select(name: string) {
    onValueChange(name);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer">
          <Input
            value={open ? query : value}
            onChange={(e) => {
              setQuery(e.target.value);
              if (value) onValueChange("");
            }}
            onFocus={() => setOpen(true)}
            placeholder="e.g. OLT Gpon Wates"
            className="pr-8"
          />
          <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.length === 0 && !showCreateOption && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No locations found.</p>
        )}
        <ul className="max-h-52 overflow-y-auto">
          {filtered.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => select(l.name)}
              >
                <Check
                  className={cn("h-3 w-3 shrink-0", value === l.name ? "opacity-100" : "opacity-0")}
                />
                <span className="flex-1 text-left">{l.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {l.type}
                </Badge>
              </button>
            </li>
          ))}
          {showCreateOption && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-primary hover:bg-accent"
                onClick={() => select(query.trim())}
              >
                <Plus className="h-3 w-3 shrink-0" />
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

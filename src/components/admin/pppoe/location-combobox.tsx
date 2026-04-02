import { Badge } from "#/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "#/components/ui/combobox";
import { Plus } from "lucide-react";
import { useState } from "react";

export interface LocationOption {
  id: number;
  name: string;
  type: "OLT" | "BTS" | "POP";
}

export function LocationCombobox({
  value,
  onValueChange,
  locations,
  allowAddNew = false
}: {
  value: LocationOption | null;
  onValueChange: (v: LocationOption | null) => void;
  locations: LocationOption[];
  allowAddNew?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  return (
    <Combobox
      items={locations}
      itemToStringLabel={(location: LocationOption) => location.name}
      value={value}
      onValueChange={onValueChange}
    >
      <ComboboxInput
        placeholder="Select a location"
        onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {!allowAddNew && "No items found."}
          {allowAddNew && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-primary hover:bg-accent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValueChange({
                  id: -1,
                  name: inputValue.trim() || "New Location",
                  type: "OLT"
                });
              }}
              aria-label="Add"
            >
              <Plus className="h-3 w-3 shrink-0" />
              Add &ldquo;{inputValue.trim() || "New Location"}&rdquo;
            </button>
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(location: LocationOption) => (
            <ComboboxItem key={location.id} value={location}>
              {location.name}
              <Badge variant="outline" className="ml-auto text-xs">
                {location.type}
              </Badge>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

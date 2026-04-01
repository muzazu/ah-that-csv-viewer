import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { Separator } from "#/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { CsvImportTab } from "./csv-import-tab";
import { ManualAddTab } from "./manual-add-tab";
import type { LocationOption } from "./location-combobox";

export function ImportSheet({
  open,
  onOpenChange,
  onDone,
  locations
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  locations: LocationOption[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto space-y-0!">
        <SheetHeader>
          <SheetTitle>Import Subscribers</SheetTitle>
        </SheetHeader>
        <Separator className="mb-4 mt-0" />
        <Tabs defaultValue="csv" className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="csv" className="flex-1">
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Manual Add
            </TabsTrigger>
          </TabsList>
          <TabsContent value="csv" className="mt-4">
            <CsvImportTab onDone={onDone} />
          </TabsContent>
          <TabsContent value="manual" className="mt-4">
            <ManualAddTab onDone={onDone} locations={locations} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

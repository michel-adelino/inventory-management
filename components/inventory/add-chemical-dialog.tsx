"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { facilities } from "@/lib/data";
import { HAZARD_CLASSES, PACKAGING, PACKAGING_LABEL, PICTOGRAM_LABEL, PICTOGRAMS, YEARS } from "@/lib/labels";
import { useStore, type InventoryRecord } from "@/lib/store";
import type { FacilityId, HazardClass, Ingredient, Packaging, PhysicalState, Pictogram, SignalWord, Unit } from "@/lib/types";
import { cn, createId, slugify, todayIso } from "@/lib/utils";

const CAS_RE = /^(\d{2,7}-\d{2}-\d|mixture)$/;
const REVIEW_READY_DATE = "2022-06-15";

type IngredientDraft = { name: string; cas: string; percent: string };

const emptyIngredient = (): IngredientDraft => ({ name: "", cas: "", percent: "" });

export function AddChemicalDialog({
  open,
  onOpenChange,
  record = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: InventoryRecord | null;
}) {
  const { state, addChemical, updateChemical, addVersion } = useStore();
  const chemical = record?.chemical;
  const location = chemical?.locations[0];
  const customerFacilities = facilities.filter((facility) => facility.customerId === state.customerId);
  const defaultFacility = state.facilityId === "all" ? (customerFacilities[0]?.id ?? "harbor") : state.facilityId;
  const defaultYear = state.year === "all" ? YEARS[0] : state.year;

  const [name, setName] = useState(chemical?.name ?? "");
  const [manufacturer, setManufacturer] = useState(chemical?.manufacturer ?? "");
  const [cas, setCas] = useState(chemical?.cas ?? "");
  const [facilityId, setFacilityId] = useState<FacilityId>(chemical?.facilityId ?? defaultFacility);
  const [year, setYear] = useState(String(chemical?.year ?? defaultYear));
  const [hazardClass, setHazardClass] = useState<HazardClass>(chemical?.hazardClass ?? "Flammable liquid");
  const [signalWord, setSignalWord] = useState<SignalWord>(chemical?.signalWord ?? "Danger");
  const [physicalState, setPhysicalState] = useState<PhysicalState>(chemical?.physicalState ?? "Liquid");
  const [packaging, setPackaging] = useState<Packaging>(chemical?.packaging ?? "drum");
  const [unit, setUnit] = useState<Unit>(chemical?.unit ?? "L");
  const [containerSize, setContainerSize] = useState(location ? String(location.containerSize) : "");
  const [containerCount, setContainerCount] = useState(location ? String(location.containerCount) : "");
  const [reorderPoint, setReorderPoint] = useState(chemical?.reorderPoint ? String(chemical.reorderPoint) : "");
  const [building, setBuilding] = useState(location?.building ?? "");
  const [room, setRoom] = useState(location?.room ?? "");
  const [cabinet, setCabinet] = useState(location?.cabinet ?? "");
  const [revisionDate, setRevisionDate] = useState(record ? (record.pinned?.revisionDate ?? "") : REVIEW_READY_DATE);
  const [pictograms, setPictograms] = useState<Pictogram[]>(chemical?.pictograms ?? ["flame"]);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    chemical
      ? chemical.ingredients.map((ingredient) => ({
          name: ingredient.name,
          cas: ingredient.cas,
          percent: String(ingredient.percent),
        }))
      : [emptyIngredient()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const size = Number(containerSize);
  const count = Number(containerCount);
  const primaryTotal = Number.isFinite(size) && Number.isFinite(count) ? size * count : 0;
  const extraTotal = (chemical?.locations.slice(1) ?? []).reduce(
    (sum, item) => sum + item.containerSize * item.containerCount,
    0,
  );

  function togglePictogram(pictogram: Pictogram) {
    setPictograms((current) =>
      current.includes(pictogram) ? current.filter((item) => item !== pictogram) : [...current, pictogram],
    );
  }

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setIngredients((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Enter the product name.";
    if (manufacturer.trim().length < 2) nextErrors.manufacturer = "Enter the manufacturer.";
    if (!CAS_RE.test(cas.trim())) nextErrors.cas = "Use a CAS number such as 67-64-1.";
    if (!Number.isFinite(size) || size <= 0) nextErrors.containerSize = "Enter a container size above zero.";
    if (!Number.isInteger(count) || count <= 0) nextErrors.containerCount = "Enter a whole container count above zero.";
    if (!building.trim() || !room.trim() || !cabinet.trim()) nextErrors.location = "Building, room, and cabinet are required.";
    if (!chemical && !revisionDate) nextErrors.revisionDate = "Enter the SDS revision date.";
    if (revisionDate && revisionDate > todayIso()) nextErrors.revisionDate = "Revision date cannot be in the future.";
    if (pictograms.length === 0) nextErrors.pictograms = "Choose at least one pictogram.";

    const parsedIngredients: Ingredient[] = [];
    ingredients.forEach((ingredient, index) => {
      if (!ingredient.name.trim()) nextErrors[`ingredient-name-${index}`] = "Name the ingredient.";
      if (!CAS_RE.test(ingredient.cas.trim())) nextErrors[`ingredient-cas-${index}`] = "Enter a CAS number or mixture.";
      const percent = Number(ingredient.percent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        nextErrors[`ingredient-percent-${index}`] = "Use a percent from 0 to 100.";
      } else {
        parsedIngredients.push({
          name: ingredient.name.trim(),
          cas: ingredient.cas.trim(),
          percent,
        });
      }
    });
    const total = parsedIngredients.reduce((sum, ingredient) => sum + ingredient.percent, 0);
    if (parsedIngredients.length === ingredients.length && (total < 98 || total > 102)) {
      nextErrors.ingredients = `Concentrations total ${total.toFixed(1)}%. They should land near 100%.`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const facility = facilities.find((item) => item.id === facilityId);
    const primaryLocation = {
      building: building.trim(),
      room: room.trim(),
      cabinet: cabinet.trim(),
      containerSize: size,
      containerCount: count,
    };
    const nextChemical = {
      id: chemical?.id ?? createId("c"),
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      cas: cas.trim(),
      signalWord,
      pictograms,
      hazardClass,
      physicalState,
      ingredients: parsedIngredients,
      unit,
      locations: chemical ? [primaryLocation, ...chemical.locations.slice(1)] : [primaryLocation],
      facilityId,
      year: Number(year),
      packaging,
      sdsId: chemical ? chemical.sdsId : createId("s"),
      sdsVersionId: chemical ? chemical.sdsVersionId : null,
      updatedAt: todayIso(),
      reorderPoint: reorderPoint.trim() ? Number(reorderPoint) : 0,
    };

    if (!chemical) {
      const versionId = createId("v");
      nextChemical.sdsVersionId = versionId;
      addChemical(nextChemical, {
        id: nextChemical.sdsId!,
        chemicalId: nextChemical.id,
        versions: [
          {
            id: versionId,
            label: "Rev 1",
            revisionDate,
            note: "Added from the inventory form.",
            fileName: `SDS_${slugify(name) || "product"}_Rev1.pdf`,
          },
        ],
      });
      toast.success(`${nextChemical.name} added to ${facility?.shortName ?? "inventory"}.`);
    } else {
      updateChemical(nextChemical);
      const pinnedDate = record?.pinned?.revisionDate ?? "";
      if (revisionDate && revisionDate !== pinnedDate) {
        const version = {
          id: createId("v"),
          label: `Rev ${(record?.document?.versions.length ?? 0) + 1}`,
          revisionDate,
          note: "Revision date set from the inventory form.",
          fileName: `SDS_${slugify(name) || "product"}_rev.pdf`,
        };
        addVersion({
          sdsId: nextChemical.sdsId ?? createId("s"),
          chemicalId: nextChemical.id,
          year: nextChemical.year,
          version,
          summary: `Saved ${version.label} for ${nextChemical.name} on the ${nextChemical.year} inventory. Earlier years keep their pinned sheet.`,
        });
      }
      toast.success(`${nextChemical.name} updated.`);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chemical ? "Edit chemical" : "Add chemical"}</DialogTitle>
          <DialogDescription>
            Container size times count is the on-hand total. A revision from 2022 sits in the proposed review window.
            That window is not a regulatory expiration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product" error={errors.name}>
                <Input value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
              </Field>
              <Field label="Manufacturer" error={errors.manufacturer}>
                <Input
                  value={manufacturer}
                  onChange={(event) => setManufacturer(event.target.value)}
                  aria-invalid={Boolean(errors.manufacturer)}
                />
              </Field>
              <Field label="CAS" error={errors.cas}>
                <Input value={cas} onChange={(event) => setCas(event.target.value)} className="font-mono" aria-invalid={Boolean(errors.cas)} />
              </Field>
              <Field label="Facility">
                <Select value={facilityId} onValueChange={(value) => setFacilityId(value as FacilityId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customerFacilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.shortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Year">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((item) => (
                      <SelectItem key={item} value={String(item)}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hazard class">
                <Select value={hazardClass} onValueChange={(value) => setHazardClass(value as HazardClass)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HAZARD_CLASSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Signal word">
                <Select value={signalWord} onValueChange={(value) => setSignalWord(value as SignalWord)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Danger">Danger</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Physical state">
                <Select value={physicalState} onValueChange={(value) => setPhysicalState(value as PhysicalState)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Liquid">Liquid</SelectItem>
                    <SelectItem value="Solid">Solid</SelectItem>
                    <SelectItem value="Gas">Gas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Packaging">
                <Select value={packaging} onValueChange={(value) => setPackaging(value as Packaging)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING.map((item) => (
                      <SelectItem key={item} value={item}>
                        {PACKAGING_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unit">
                <Select value={unit} onValueChange={(value) => setUnit(value as Unit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Liters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="gal">Gallons</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Container size" error={errors.containerSize}>
                <Input
                  inputMode="decimal"
                  value={containerSize}
                  onChange={(event) => setContainerSize(event.target.value)}
                  aria-invalid={Boolean(errors.containerSize)}
                />
              </Field>
              <Field label="Container count" error={errors.containerCount}>
                <Input
                  inputMode="numeric"
                  value={containerCount}
                  onChange={(event) => setContainerCount(event.target.value)}
                  aria-invalid={Boolean(errors.containerCount)}
                />
              </Field>
              <Field label="On hand">
                <Input readOnly value={`${primaryTotal + extraTotal} ${unit}`} />
              </Field>
              <Field label="Reorder point">
                <Input inputMode="decimal" value={reorderPoint} onChange={(event) => setReorderPoint(event.target.value)} placeholder="Optional" />
              </Field>
            </div>

            <fieldset>
              <legend className="text-[13px] font-medium">Storage location</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Input value={building} onChange={(event) => setBuilding(event.target.value)} placeholder="Building" aria-label="Building" />
                <Input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Room" aria-label="Room" />
                <Input value={cabinet} onChange={(event) => setCabinet(event.target.value)} placeholder="Cabinet" aria-label="Cabinet" />
              </div>
              {chemical && chemical.locations.length > 1 ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {chemical.locations.length - 1} other storage position{chemical.locations.length - 1 === 1 ? "" : "s"} stay on this line.
                </p>
              ) : null}
              {errors.location ? <p className="mt-1 text-xs text-destructive">{errors.location}</p> : null}
            </fieldset>

            <fieldset>
              <legend className="text-[13px] font-medium">Pictograms</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PICTOGRAMS.map((pictogram) => {
                  const selected = pictograms.includes(pictogram);
                  return (
                    <button
                      key={pictogram}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePictogram(pictogram)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px]",
                        selected ? "border-primary bg-ok-soft text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {PICTOGRAM_LABEL[pictogram]}
                    </button>
                  );
                })}
              </div>
              {errors.pictograms ? <p className="mt-1 text-xs text-destructive">{errors.pictograms}</p> : null}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-[13px] font-medium">Ingredients</legend>
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_90px]">
                  <Input
                    value={ingredient.name}
                    onChange={(event) => updateIngredient(index, "name", event.target.value)}
                    placeholder="Name"
                    aria-label={`Ingredient ${index + 1} name`}
                    aria-invalid={Boolean(errors[`ingredient-name-${index}`])}
                  />
                  <Input
                    value={ingredient.cas}
                    onChange={(event) => updateIngredient(index, "cas", event.target.value)}
                    placeholder="CAS"
                    className="font-mono"
                    aria-label={`Ingredient ${index + 1} CAS`}
                    aria-invalid={Boolean(errors[`ingredient-cas-${index}`])}
                  />
                  <Input
                    value={ingredient.percent}
                    onChange={(event) => updateIngredient(index, "percent", event.target.value)}
                    placeholder="%"
                    inputMode="decimal"
                    aria-label={`Ingredient ${index + 1} percent`}
                    aria-invalid={Boolean(errors[`ingredient-percent-${index}`])}
                  />
                </div>
              ))}
              {errors.ingredients ? <p className="text-xs text-destructive">{errors.ingredients}</p> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIngredients((current) => [...current, emptyIngredient()])}
              >
                Add ingredient
              </Button>
            </fieldset>

            <Field label="SDS revision date" error={errors.revisionDate}>
              <Input
                type="date"
                max={todayIso()}
                value={revisionDate}
                onChange={(event) => setRevisionDate(event.target.value)}
                aria-invalid={Boolean(errors.revisionDate)}
              />
              <p className="text-[12px] leading-5 text-muted-foreground">
                {REVIEW_READY_DATE} is already inside the proposed five-year review window. Changing the date on an existing line adds a version for this inventory year only.
              </p>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{chemical ? "Save changes" : "Save chemical"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

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
import { useStore } from "@/lib/store";
import type { FacilityId, HazardClass, Ingredient, Packaging, PhysicalState, Pictogram, SignalWord, Unit } from "@/lib/types";
import { createId, slugify, todayIso } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CAS_RE = /^(\d{2,7}-\d{2}-\d|mixture)$/;

type IngredientDraft = { name: string; cas: string; percent: string };

const emptyIngredient = (): IngredientDraft => ({ name: "", cas: "", percent: "" });

export function AddChemicalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, addChemical } = useStore();
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [cas, setCas] = useState("");
  const [facilityId, setFacilityId] = useState<FacilityId>(state.facilityId === "all" ? "harbor" : state.facilityId);
  const [year, setYear] = useState(String(YEARS[0]));
  const [hazardClass, setHazardClass] = useState<HazardClass>("Flammable liquid");
  const [signalWord, setSignalWord] = useState<SignalWord>("Danger");
  const [physicalState, setPhysicalState] = useState<PhysicalState>("Liquid");
  const [packaging, setPackaging] = useState<Packaging>("drum");
  const [unit, setUnit] = useState<Unit>("L");
  const [quantity, setQuantity] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [revisionDate, setRevisionDate] = useState(todayIso());
  const [pictograms, setPictograms] = useState<Pictogram[]>(["flame"]);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName("");
    setManufacturer("");
    setCas("");
    setFacilityId(state.facilityId === "all" ? "harbor" : state.facilityId);
    setYear(String(YEARS[0]));
    setHazardClass("Flammable liquid");
    setSignalWord("Danger");
    setPhysicalState("Liquid");
    setPackaging("drum");
    setUnit("L");
    setQuantity("");
    setReorderPoint("");
    setBuilding("");
    setRoom("");
    setCabinet("");
    setRevisionDate(todayIso());
    setPictograms(["flame"]);
    setIngredients([emptyIngredient()]);
    setErrors({});
  }

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
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.quantity = "Enter a quantity above zero.";
    if (!building.trim() || !room.trim() || !cabinet.trim()) nextErrors.location = "Building, room, and cabinet are required.";
    if (!revisionDate || revisionDate > todayIso()) nextErrors.revisionDate = "Revision date cannot be in the future.";
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

    const chemicalId = createId("c");
    const sdsId = createId("s");
    const facility = facilities.find((item) => item.id === facilityId);
    addChemical(
      {
        id: chemicalId,
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        cas: cas.trim(),
        signalWord,
        pictograms,
        hazardClass,
        physicalState,
        ingredients: parsedIngredients,
        unit,
        locations: [
          {
            building: building.trim(),
            room: room.trim(),
            cabinet: cabinet.trim(),
            quantity: amount,
          },
        ],
        facilityId,
        year: Number(year),
        packaging,
        sdsId,
        reorderPoint: reorderPoint.trim() ? Number(reorderPoint) : 0,
      },
      {
        id: sdsId,
        chemicalId,
        versions: [
          {
            id: createId("v"),
            label: "Rev 1",
            revisionDate,
            note: "Added from the inventory form.",
            fileName: `SDS_${slugify(name) || "product"}_Rev1.pdf`,
          },
        ],
      },
    );
    toast.success(`${name.trim()} added to ${facility?.shortName ?? "inventory"}.`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add chemical</DialogTitle>
          <DialogDescription>
            Saves in this browser only. A revision date older than five years is flagged as soon as you add it.
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
                    {facilities.map((facility) => (
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
              <Field label="Quantity" error={errors.quantity}>
                <Input
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-invalid={Boolean(errors.quantity)}
                />
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
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save chemical</Button>
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

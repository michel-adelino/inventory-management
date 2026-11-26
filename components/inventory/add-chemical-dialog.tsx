"use client";

import { useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
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
              <Field
                label="CAS"
                hint="The number on the product label or SDS, written like 67-64-1. Type mixture when the product has no single number."
                error={errors.cas}
              >
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
              <Field label="Year" hint="The inventory year this line belongs to. Another year can keep its own quantity and its own SDS.">
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
              <Field label="Hazard class" hint="The main hazard named on the SDS, such as flammable liquid or corrosive.">
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
              <Field label="Signal word" hint="The word printed on the SDS. Danger is the more severe choice. Warning is the less severe one.">
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
              <Field label="Physical state" hint="How the product is stored: liquid, solid, or gas.">
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
              <Field label="Packaging" hint="The container it is stored in, such as a drum, bottle, or cylinder.">
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
              <Field label="Unit" hint="The measurement for container size and the on-hand total: liters, kilograms, or gallons.">
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
              <Field
                label="Container size"
                hint="How much one container holds, in the unit above. A 200 L drum is 200."
                error={errors.containerSize}
              >
                <NumericInput
                  value={containerSize}
                  onValueChange={setContainerSize}
                  aria-invalid={Boolean(errors.containerSize)}
                />
              </Field>
              <Field
                label="Container count"
                hint="How many of those containers are in this location. Use a whole number."
                error={errors.containerCount}
              >
                <NumericInput
                  integer
                  value={containerCount}
                  onValueChange={setContainerCount}
                  aria-invalid={Boolean(errors.containerCount)}
                />
              </Field>
              <Field label="On hand" hint="Calculated for you: container size times the number of containers.">
                <Input readOnly value={`${primaryTotal + extraTotal} ${unit}`} />
              </Field>
              <Field
                label="Reorder point"
                hint="Optional. The dashboard flags this line when the on-hand total falls below this amount."
              >
                <NumericInput value={reorderPoint} onValueChange={setReorderPoint} placeholder="Optional" />
              </Field>
            </div>

            <fieldset>
              <SectionTitle hint="Where the containers are kept. Include the building, the room, and the cabinet or bay.">
                Storage location
              </SectionTitle>
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
              <SectionTitle hint="The diamond hazard symbols on the label. Select each one printed on the SDS.">
                Pictograms
              </SectionTitle>
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
              <SectionTitle hint="Each substance in the product: its name, its CAS number, and its percent. The percents should add up to about 100.">
                Ingredients
              </SectionTitle>
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
                  <NumericInput
                    value={ingredient.percent}
                    onValueChange={(value) => updateIngredient(index, "percent", value)}
                    placeholder="%"
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

            <Field
              label="SDS revision date"
              hint="The date printed on the safety data sheet. A date about four years old falls in the review window."
              error={errors.revisionDate}
            >
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

function keepDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function keepInteger(value: string) {
  return value.replace(/\D/g, "");
}

function NumericInput({
  integer = false,
  value,
  onValueChange,
  ...props
}: { integer?: boolean; value: string; onValueChange: (value: string) => void } & Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type"
>) {
  return (
    <Input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={0}
      step={integer ? 1 : "any"}
      value={value}
      onChange={(event) => onValueChange(integer ? keepInteger(event.target.value) : keepDecimal(event.target.value))}
      onWheel={(event) => event.currentTarget.blur()}
      {...props}
    />
  );
}

function FieldHint({ label, text }: { label: string; text: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, above: true });

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 256;
    const margin = 12;
    const above = rect.top > 96;
    const left = Math.min(window.innerWidth - width - margin, Math.max(margin, rect.left));
    setPosition({ top: above ? rect.top - 8 : rect.bottom + 8, left, above });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={() => {
          if (document.activeElement !== buttonRef.current) setOpen(false);
        }}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp className="size-3.5" />
      </button>
      {open
        ? createPortal(
            <div
              role="tooltip"
              style={{
                top: position.top,
                left: position.left,
                transform: position.above ? "translateY(-100%)" : undefined,
              }}
              className="pointer-events-none fixed z-[80] w-64 rounded-md bg-[#1c1915] px-2.5 py-1.5 text-left text-xs leading-5 font-normal text-[#f4f1ea] shadow-lg"
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {hint ? <FieldHint label={label} text={hint} /> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SectionTitle({ hint, children }: { hint: string; children: string }) {
  return (
    <legend className="flex items-center gap-1.5 text-[13px] font-medium">
      {children}
      <FieldHint label={children} text={hint} />
    </legend>
  );
}

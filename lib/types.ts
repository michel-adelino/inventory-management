export type FacilityId = "harbor" | "ridge" | "atlas";

export type Packaging = "drum" | "jerrycan" | "bottle" | "sack" | "cylinder" | "tote";

export type Pictogram =
  | "flame"
  | "corrosion"
  | "health"
  | "exclamation"
  | "oxidizer"
  | "environment";

export type SignalWord = "Danger" | "Warning";

export type HazardClass =
  | "Flammable liquid"
  | "Flammable gas"
  | "Corrosive"
  | "Oxidizer"
  | "Health hazard"
  | "Irritant";

export type PhysicalState = "Liquid" | "Solid" | "Gas";

export type Unit = "L" | "kg" | "gal";

export type SdsStatus = "current" | "review" | "outdated";

export type Facility = {
  id: FacilityId;
  name: string;
  shortName: string;
  city: string;
  state: string;
  address: string;
  epaId: string;
  image: string;
  kind: string;
};

export type Ingredient = {
  name: string;
  cas: string;
  percent: number;
};

export type StockLocation = {
  building: string;
  room: string;
  cabinet: string;
  quantity: number;
};

export type Chemical = {
  id: string;
  name: string;
  manufacturer: string;
  cas: string;
  signalWord: SignalWord;
  pictograms: Pictogram[];
  hazardClass: HazardClass;
  physicalState: PhysicalState;
  ingredients: Ingredient[];
  unit: Unit;
  locations: StockLocation[];
  facilityId: FacilityId;
  year: number;
  packaging: Packaging;
  sdsId: string;
  reorderPoint: number;
};

export type SdsVersion = {
  id: string;
  label: string;
  revisionDate: string;
  note: string;
  fileName: string;
};

export type SdsDocument = {
  id: string;
  chemicalId: string;
  versions: SdsVersion[];
};

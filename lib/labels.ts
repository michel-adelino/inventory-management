import type { HazardClass, Packaging, Pictogram, SdsStatus } from "./types";

export const HAZARD_CLASSES: HazardClass[] = [
  "Flammable liquid",
  "Flammable gas",
  "Corrosive",
  "Oxidizer",
  "Health hazard",
  "Irritant",
];

export const HAZARD_SHORT: Record<HazardClass, string> = {
  "Flammable liquid": "Flammable",
  "Flammable gas": "Gas",
  Corrosive: "Corrosive",
  Oxidizer: "Oxidizer",
  "Health hazard": "Health",
  Irritant: "Irritant",
};

export const PACKAGING: Packaging[] = ["drum", "jerrycan", "bottle", "sack", "cylinder", "tote"];

export const PACKAGING_LABEL: Record<Packaging, string> = {
  drum: "Drum",
  jerrycan: "Jerrycan",
  bottle: "Bottle",
  sack: "Sack",
  cylinder: "Cylinder",
  tote: "Tote",
};

export const PACKAGING_IMAGE: Record<Packaging, string> = {
  drum: "/images/pack-drum.jpg",
  jerrycan: "/images/pack-jerrycan.jpg",
  bottle: "/images/pack-bottle.jpg",
  sack: "/images/pack-sack.jpg",
  cylinder: "/images/pack-cylinder.jpg",
  tote: "/images/pack-tote.jpg",
};

export const PICTOGRAMS: Pictogram[] = [
  "flame",
  "corrosion",
  "health",
  "exclamation",
  "oxidizer",
  "environment",
];

export const PICTOGRAM_LABEL: Record<Pictogram, string> = {
  flame: "Flammable",
  corrosion: "Corrosive",
  health: "Health hazard",
  exclamation: "Irritant",
  oxidizer: "Oxidizer",
  environment: "Environmental hazard",
};

export const STATUS_LABEL: Record<SdsStatus, string> = {
  current: "Current",
  review: "Review",
  outdated: "Outdated",
  missing: "Missing",
};

export const YEARS = [2026, 2025, 2024, 2023];

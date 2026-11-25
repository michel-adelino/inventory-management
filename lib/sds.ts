import {
  addYears,
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { HazardClass, SdsDocument, SdsStatus, SdsVersion } from "./types";

export const SDS_SECTIONS = [
  "Identification",
  "Hazard identification",
  "Composition / information on ingredients",
  "First-aid measures",
  "Fire-fighting measures",
  "Accidental release measures",
  "Handling and storage",
  "Exposure controls / personal protection",
  "Physical and chemical properties",
  "Stability and reactivity",
  "Toxicological information",
  "Ecological information",
  "Disposal considerations",
  "Transport information",
  "Regulatory information",
  "Other information",
] as const;

export function latestVersion(document: SdsDocument): SdsVersion {
  return [...document.versions].sort((a, b) => b.revisionDate.localeCompare(a.revisionDate))[0];
}

/**
 * Proposed review rule for this workspace, not a regulatory expiration.
 * A sheet is outdated when the pinned revision is older than five years.
 * The year before that date is the review window.
 */
export function sdsTiming(revisionDate: string, today = new Date()) {
  const revised = startOfDay(parseISO(revisionDate));
  const now = startOfDay(today);
  const expiry = addYears(revised, 5);
  const reviewStart = addYears(revised, 4);
  const daysUntilExpiry = differenceInCalendarDays(expiry, now);

  let status: SdsStatus = "current";
  if (isBefore(expiry, now)) status = "outdated";
  else if (!isBefore(now, reviewStart)) status = "review";

  return {
    status,
    daysUntilExpiry,
    reviseBy: format(expiry, "MMM d, yyyy"),
  };
}

export function statusDetail(status: SdsStatus, reviseBy: string, revisionDate: string, today = new Date()) {
  if (status === "missing") return "No safety data sheet is on file for this inventory line.";
  if (status === "outdated") {
    const expiry = addYears(startOfDay(parseISO(revisionDate)), 5);
    return `Past the proposed five-year review point by ${formatDistanceStrict(expiry, startOfDay(today))}.`;
  }
  if (status === "review") return `Inside the proposed review window. Review point ${reviseBy}.`;
  return `Inside the proposed five-year window. Review point ${reviseBy}.`;
}

export function sectionNote(section: number, hazard: HazardClass, state: string) {
  switch (section) {
    case 4:
      return "Move the person to fresh air. Rinse skin or eyes with water and get medical help if symptoms continue.";
    case 5:
      return hazard.startsWith("Flammable")
        ? "Remove ignition sources. Use foam, dry chemical, or carbon dioxide. Do not use a direct water jet on burning liquid."
        : "Use media suited to the surrounding fire. Heated containers may rupture.";
    case 6:
      return "Stop the leak if it is safe. Absorb liquid or sweep solid into a labeled container. Keep the material out of drains.";
    case 7:
      return `Keep the ${state.toLowerCase()} in a closed container in the assigned cabinet, away from incompatible products.`;
    case 8:
      return "Wear chemical goggles, gloves suited to this hazard class, and protective clothing. Use local exhaust where vapor or dust can form.";
    case 9:
      return `Physical state on this inventory record: ${state.toLowerCase()}. Confirm boiling point, flash point, and pH on the manufacturer PDF.`;
    case 10:
      return "Stable in the storage conditions on the label. Do not mix with the incompatibles named for this hazard class.";
    case 11:
      return "Exposure can irritate tissue or cause more serious harm. The signal word on the label is the governing warning.";
    case 12:
      return hazard === "Corrosive" || hazard === "Flammable liquid"
        ? "Do not release to surface water or soil. Review the manufacturer SDS before classifying wastewater."
        : "Prevent release to soil and water. Ecotoxicity values belong to the manufacturer SDS.";
    case 13:
      return "Dispose of the contents and container through a licensed hazardous-waste contractor, using the facility waste profile.";
    case 14:
      return "Ship under the DOT proper shipping name on the manufacturer SDS. Keep containers upright and closed.";
    case 15:
      return "Covered by OSHA Hazard Communication. Amounts on site may be reportable under EPCRA.";
    case 16:
      return "Northline built this excerpt from sample inventory data. Confirm it against the manufacturer PDF before operational use.";
    default:
      return "";
  }
}

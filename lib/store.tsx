"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { activity as seedActivity, chemicals as seedChemicals, documents as seedDocuments, facilities } from "./data";
import { latestVersion, sdsTiming } from "./sds";
import type {
  ActivityEntry,
  Chemical,
  CustomerId,
  FacilityId,
  SdsDocument,
  SdsStatus,
  SdsVersion,
} from "./types";
import { createId, todayIso } from "./utils";

export type InventoryRecord = {
  chemical: Chemical;
  document: SdsDocument | null;
  pinned: SdsVersion | null;
  status: SdsStatus;
  daysUntilExpiry: number | null;
  reviseBy: string;
};

export type YearScope = number | "all";

type State = {
  chemicals: Chemical[];
  documents: SdsDocument[];
  activity: ActivityEntry[];
  customerId: CustomerId;
  facilityId: FacilityId | "all";
  year: YearScope;
};

type Action =
  | { type: "customer"; customerId: CustomerId }
  | { type: "facility"; facilityId: FacilityId | "all" }
  | { type: "year"; year: YearScope }
  | { type: "add"; chemical: Chemical; document: SdsDocument | null }
  | { type: "update"; chemical: Chemical }
  | { type: "version"; sdsId: string; chemicalId: string; year: number; version: SdsVersion; summary: string };

function stamp(summary: string, href: string): ActivityEntry {
  return { id: createId("act"), at: new Date().toISOString(), summary, href };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "customer": {
      const owned = facilities.filter((facility) => facility.customerId === action.customerId);
      const keep = owned.some((facility) => facility.id === state.facilityId);
      return {
        ...state,
        customerId: action.customerId,
        facilityId: keep ? state.facilityId : (owned[0]?.id ?? "all"),
      };
    }
    case "facility":
      return { ...state, facilityId: action.facilityId };
    case "year":
      return { ...state, year: action.year };
    case "add":
      return {
        ...state,
        chemicals: [action.chemical, ...state.chemicals],
        documents: action.document ? [action.document, ...state.documents] : state.documents,
        activity: [
          stamp(
            `Added ${action.chemical.name} to the ${action.chemical.year} inventory.`,
            `/inventory?id=${action.chemical.id}`,
          ),
          ...state.activity,
        ],
      };
    case "update":
      return {
        ...state,
        chemicals: state.chemicals.map((chemical) =>
          chemical.id === action.chemical.id ? { ...action.chemical, updatedAt: todayIso() } : chemical,
        ),
        activity: [
          stamp(
            `Updated ${action.chemical.name} on the ${action.chemical.year} inventory.`,
            `/inventory?id=${action.chemical.id}`,
          ),
          ...state.activity,
        ],
      };
    case "version": {
      const exists = state.documents.some((document) => document.id === action.sdsId);
      const documents = exists
        ? state.documents.map((document) =>
            document.id === action.sdsId
              ? { ...document, versions: [...document.versions, action.version] }
              : document,
          )
        : [
            ...state.documents,
            { id: action.sdsId, chemicalId: action.chemicalId, versions: [action.version] },
          ];
      const chemicals = state.chemicals.map((chemical) => {
        const sameSheet = chemical.sdsId === action.sdsId;
        const firstSheet = chemical.id === action.chemicalId && !chemical.sdsId;
        if ((sameSheet || firstSheet) && chemical.year === action.year) {
          return {
            ...chemical,
            sdsId: action.sdsId,
            sdsVersionId: action.version.id,
            updatedAt: todayIso(),
          };
        }
        return chemical;
      });
      return {
        ...state,
        documents,
        chemicals,
        activity: [stamp(action.summary, `/sds?id=${action.sdsId}`), ...state.activity],
      };
    }
  }
}

type StoreValue = {
  state: State;
  records: InventoryRecord[];
  scoped: InventoryRecord[];
  setCustomer: (customerId: CustomerId) => void;
  setFacility: (facilityId: FacilityId | "all") => void;
  setYear: (year: YearScope) => void;
  addChemical: (chemical: Chemical, document: SdsDocument | null) => void;
  updateChemical: (chemical: Chemical) => void;
  addVersion: (input: {
    sdsId: string;
    chemicalId: string;
    year: number;
    version: SdsVersion;
    summary: string;
  }) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function toRecords(chemicals: Chemical[], documents: SdsDocument[]): InventoryRecord[] {
  return chemicals.map((chemical) => {
    const document = chemical.sdsId ? (documents.find((item) => item.id === chemical.sdsId) ?? null) : null;
    const pinned =
      document?.versions.find((version) => version.id === chemical.sdsVersionId) ??
      (document && document.versions.length > 0 ? latestVersion(document) : null);
    if (!document || !pinned) {
      return {
        chemical,
        document: null,
        pinned: null,
        status: "missing" as const,
        daysUntilExpiry: null,
        reviseBy: "",
      };
    }
    return { chemical, document, pinned, ...sdsTiming(pinned.revisionDate) };
  });
}

export function inScope(
  chemical: Chemical,
  scope: { customerId: CustomerId; facilityId: FacilityId | "all"; year: YearScope },
) {
  const facility = facilities.find((item) => item.id === chemical.facilityId);
  if (!facility || facility.customerId !== scope.customerId) return false;
  if (scope.facilityId !== "all" && chemical.facilityId !== scope.facilityId) return false;
  if (scope.year !== "all" && chemical.year !== scope.year) return false;
  return true;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    chemicals: seedChemicals,
    documents: seedDocuments,
    activity: seedActivity,
    customerId: "pinnacle",
    facilityId: "harbor",
    year: 2026,
  });

  const value = useMemo<StoreValue>(() => {
    const records = toRecords(state.chemicals, state.documents);
    const scoped = records.filter((record) => inScope(record.chemical, state));
    return {
      state,
      records,
      scoped,
      setCustomer: (customerId) => dispatch({ type: "customer", customerId }),
      setFacility: (facilityId) => dispatch({ type: "facility", facilityId }),
      setYear: (year) => dispatch({ type: "year", year }),
      addChemical: (chemical, document) => dispatch({ type: "add", chemical, document }),
      updateChemical: (chemical) => dispatch({ type: "update", chemical }),
      addVersion: (input) => dispatch({ type: "version", ...input }),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

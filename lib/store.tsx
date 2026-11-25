"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { chemicals as seedChemicals, documents as seedDocuments } from "./data";
import { latestVersion, sdsTiming } from "./sds";
import type { Chemical, FacilityId, SdsDocument, SdsStatus, SdsVersion } from "./types";

export type InventoryRecord = {
  chemical: Chemical;
  document: SdsDocument;
  latest: SdsVersion;
  status: SdsStatus;
  daysUntilExpiry: number;
  reviseBy: string;
};

type State = {
  chemicals: Chemical[];
  documents: SdsDocument[];
  facilityId: FacilityId | "all";
};

type Action =
  | { type: "facility"; facilityId: FacilityId | "all" }
  | { type: "add"; chemical: Chemical; document: SdsDocument }
  | { type: "version"; sdsId: string; version: SdsVersion };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "facility":
      return { ...state, facilityId: action.facilityId };
    case "add":
      return {
        ...state,
        chemicals: [action.chemical, ...state.chemicals],
        documents: [action.document, ...state.documents],
      };
    case "version":
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.sdsId
            ? { ...document, versions: [...document.versions, action.version] }
            : document,
        ),
      };
  }
}

type StoreValue = {
  state: State;
  records: InventoryRecord[];
  scoped: InventoryRecord[];
  setFacility: (facilityId: FacilityId | "all") => void;
  addChemical: (chemical: Chemical, document: SdsDocument) => void;
  addVersion: (sdsId: string, version: SdsVersion) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function toRecords(chemicals: Chemical[], documents: SdsDocument[]): InventoryRecord[] {
  return chemicals.flatMap((chemical) => {
    const document = documents.find((item) => item.id === chemical.sdsId);
    if (!document || document.versions.length === 0) return [];
    const latest = latestVersion(document);
    return [{ chemical, document, latest, ...sdsTiming(latest.revisionDate) }];
  });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    chemicals: seedChemicals,
    documents: seedDocuments,
    facilityId: "all",
  });

  const value = useMemo<StoreValue>(() => {
    const records = toRecords(state.chemicals, state.documents);
    const scoped = records.filter(
      (record) => state.facilityId === "all" || record.chemical.facilityId === state.facilityId,
    );
    return {
      state,
      records,
      scoped,
      setFacility: (facilityId) => dispatch({ type: "facility", facilityId }),
      addChemical: (chemical, document) => dispatch({ type: "add", chemical, document }),
      addVersion: (sdsId, version) => dispatch({ type: "version", sdsId, version }),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

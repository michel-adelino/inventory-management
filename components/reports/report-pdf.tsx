import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

export type ReportPdfModel = {
  title: string;
  intro: string;
  columns: string[];
  rows: string[][];
  customerName: string;
  facilityName: string;
  address: string;
  epaId: string;
  yearLabel: string;
  generatedLabel: string;
};

const ink = "#1C1915";
const muted = "#5F5A53";
const line = "#E4DDD0";
const paper = "#F7F4EE";
const accent = "#0F6E56";

const styles = StyleSheet.create({
  page: {
    backgroundColor: paper,
    paddingTop: 108,
    paddingBottom: 46,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    color: ink,
  },
  band: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 92,
    backgroundColor: ink,
    paddingTop: 16,
    paddingHorizontal: 32,
  },
  accent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: accent,
  },
  bandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#F6F3EC",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.2,
  },
  kicker: {
    color: "#C8C2B6",
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  facility: {
    marginTop: 8,
    color: "#F6F3EC",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  bandMeta: {
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bandMuted: {
    color: "#C8C2B6",
    fontSize: 8,
    maxWidth: 380,
  },
  epa: {
    color: "#F6F3EC",
    fontSize: 8,
    fontFamily: "Courier",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.2,
    maxWidth: 360,
  },
  customer: {
    marginTop: 3,
    color: muted,
    fontSize: 9,
  },
  meta: {
    alignItems: "flex-end",
  },
  metaLabel: {
    color: muted,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metaValue: {
    marginTop: 1,
    fontSize: 9,
    fontFamily: "Courier",
  },
  intro: {
    marginTop: 12,
    fontSize: 9,
    lineHeight: 1.45,
    color: muted,
  },
  table: {
    marginTop: 16,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: ink,
    paddingBottom: 4,
    marginBottom: 1,
  },
  headText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: line,
    paddingVertical: 5,
  },
  rowAlt: {
    backgroundColor: "#F1EBE1",
  },
  slot: {
    paddingRight: 8,
  },
  cell: {
    fontSize: 8,
    lineHeight: 1.35,
  },
  cellStrong: {
    fontFamily: "Helvetica-Bold",
  },
  cellMono: {
    fontFamily: "Courier",
    fontSize: 7.5,
  },
  empty: {
    marginTop: 28,
    borderWidth: 0.5,
    borderColor: line,
    borderStyle: "dashed",
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 10,
    color: muted,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    borderTopWidth: 0.5,
    borderTopColor: line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: muted,
  },
});

function columnWeight(label: string, index: number) {
  const key = label.toLowerCase();
  if (index === 0) return 2.2;
  if (key.includes("location") || key.includes("manufacturer")) return 2;
  if (key.includes("hazard") || key.includes("signal")) return 1.35;
  if (key === "count" || key === "unit" || key === "flag" || key === "state") return 0.7;
  if (key.includes("cas") || key.includes("size") || key.includes("hand") || key.includes("date") || key.includes("year") || key.includes("version") || key.includes("revision") || key.includes("point")) return 1.05;
  return 1.15;
}

function columnWidths(columns: string[]) {
  const weights = columns.map((column, index) => columnWeight(column, index));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => `${((value / total) * 100).toFixed(2)}%`);
}

function isMono(value: string) {
  return value === "—" || /^(L|kg|gal)$/.test(value) || /^[\d][\d,.\-/: ]*$/.test(value);
}

export function ReportPdfDocument({ model }: { model: ReportPdfModel }) {
  return (
    <Document title={model.title} author="Northline" subject={model.facilityName}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band} fixed>
          <View style={styles.bandRow}>
            <Text style={styles.brand}>Northline</Text>
            <Text style={styles.kicker}>Sample excerpt</Text>
          </View>
          <Text style={styles.facility}>{model.facilityName}</Text>
          <View style={styles.bandMeta}>
            <Text style={styles.bandMuted}>{model.address || model.customerName}</Text>
            {model.epaId ? <Text style={styles.epa}>{model.epaId}</Text> : <Text style={styles.epa}> </Text>}
          </View>
          <View style={styles.accent} />
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{model.title}</Text>
            <Text style={styles.customer}>{model.customerName}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Reporting year</Text>
            <Text style={styles.metaValue}>{model.yearLabel}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Generated</Text>
            <Text style={styles.metaValue}>{model.generatedLabel}</Text>
          </View>
        </View>

        <Text style={styles.intro}>{model.intro}</Text>

        {model.rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No rows for this facility and year.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.head} fixed>
              {model.columns.map((column, index) => (
                <View key={column} style={[styles.slot, { width: columnWidths(model.columns)[index] }]}>
                  <Text style={styles.headText}>{column}</Text>
                </View>
              ))}
            </View>
            {model.rows.map((row, rowIndex) => (
              <View
                key={`${row[0]}-${rowIndex}`}
                style={rowIndex % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
                wrap={false}
              >
                {row.map((cell, cellIndex) => (
                  <View key={cellIndex} style={[styles.slot, { width: columnWidths(model.columns)[cellIndex] }]}>
                    <Text
                      style={[
                        styles.cell,
                        ...(cellIndex === 0 ? [styles.cellStrong] : []),
                        ...(cellIndex > 0 && isMono(cell) ? [styles.cellMono] : []),
                      ]}
                    >
                      {cell}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Sample excerpt. Not a regulatory submission.</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

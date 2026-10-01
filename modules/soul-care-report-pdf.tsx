// PDF layout for the Soul Care report. Loaded on demand (dynamic import) so @react-pdf stays out of the main bundle.
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer"

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logo: { width: 30, height: 30, marginRight: 10 },
  title: { fontSize: 16, fontWeight: 700, color: "#1B3A2D" },
  subtitle: { fontSize: 9, color: "#666", marginTop: 2 },
  dateRange: { fontSize: 9, color: "#666", textAlign: "right" },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statBox: { width: "23%", borderWidth: 1, borderColor: "#e2e2e2", borderRadius: 5, padding: 8 },
  statValue: { fontSize: 15, fontWeight: 700, color: "#1B3A2D" },
  statLabel: { fontSize: 7.5, color: "#666", marginTop: 2 },
  statSub: { fontSize: 7, color: "#A66D15", marginTop: 1 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  chartBox: { width: "23%", borderWidth: 1, borderColor: "#e2e2e2", borderRadius: 5, padding: 6 },
  chartTitle: { fontSize: 7.5, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase" },
  chartImage: { width: "100%" },
  summaryBox: { borderWidth: 1, borderColor: "#F0DFAF", backgroundColor: "#FEF6E4", borderRadius: 6, padding: 10, marginTop: 4 },
  summaryLabel: { fontSize: 8, fontWeight: 700, color: "#A66D15", marginBottom: 4, textTransform: "uppercase" },
  summaryText: { fontSize: 8.5, lineHeight: 1.5, color: "#222" },
})

function Stat({ value, label, sub }: { value: any; label: string; sub?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  )
}

function SoulCareReportPDF({ funnelStats: f, ncStats: n, summary, dateFrom, dateTo, chartImages: c, logoDataUri }: any) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View wrap={false}>
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              {logoDataUri && <Image src={logoDataUri} style={s.logo} />}
              <View>
                <Text style={s.title}>Soul Care Reporting Dashboard</Text>
                <Text style={s.subtitle}>RCCG The Envoys — Turning information into insight and insight into impact</Text>
              </View>
            </View>
            <Text style={s.dateRange}>{dateFrom || "All time"} to {dateTo || "Present"}{"\n"}Generated {new Date().toLocaleDateString()}</Text>
          </View>
          <Text style={s.sectionLabel}>VIP → Membership Funnel</Text>
          <View style={s.statRow}>
            <Stat value={f?.totalOverviews ?? 0} label="Overviews Submitted" />
            <Stat value={f?.recommended ?? 0} label="Recommended (Yes)" sub={`${f?.recommendationRate ?? 0}% of overviews`} />
            <Stat value={f?.graduated ?? 0} label="Potential Envoys Graduated" sub={`${f?.graduationRate ?? 0}% graduation rate`} />
            <Stat value={`${f?.overallConversionRate ?? 0}%`} label="Overall VIP → Member" sub="End-to-end conversion" />
          </View>
          <Text style={s.sectionLabel}>New Converts</Text>
          <View style={s.statRow}>
            <Stat value={n?.total ?? 0} label="Total New Converts" />
            <Stat value={n?.completed ?? 0} label="Fully Discipled" />
            <Stat value={n?.trainingDone ?? 0} label="Training Completed" />
            <Stat value={`${n?.retentionPct ?? 0}%`} label="Retention Rate" />
          </View>
          {c && (c.vipDecision || c.vipFunnel || c.ncType || c.ncMonth) && (
            <>
              <Text style={s.sectionLabel}>Visual Breakdown</Text>
              <View style={s.chartRow}>
                {[["VIP Decision Split", c.vipDecision], ["VIP Funnel Stages", c.vipFunnel], ["New Converts by Type", c.ncType], ["Weekly Reach", c.ncMonth]].map(([t, img]) => (
                  <View key={t} style={s.chartBox}>
                    <Text style={s.chartTitle}>{t}</Text>
                    {img && <Image src={img} style={s.chartImage} />}
                  </View>
                ))}
              </View>
            </>
          )}
          {summary && (
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>Period Summary</Text>
              <Text style={s.summaryText}>{summary}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}

export async function renderSoulCarePdf(props: any) {
  return pdf(<SoulCareReportPDF {...props} />).toBlob()
}

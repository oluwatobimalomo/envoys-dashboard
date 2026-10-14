import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const pdfStyles = StyleSheet.create({
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
});

function SoulCareReportPDF({ funnelStats, ncStats, aiSummary, dateFrom, dateTo, chartImages, logoDataUri }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <View wrap={false}>
          <View style={pdfStyles.headerRow}>
            <View style={pdfStyles.headerLeft}>
              {logoDataUri && <Image src={logoDataUri} style={pdfStyles.logo} />}
              <View>
                <Text style={pdfStyles.title}>Soul Care Reporting Dashboard</Text>
                <Text style={pdfStyles.subtitle}>RCCG The Envoys — Turning information into insight and insight into impact</Text>
              </View>
            </View>
            <Text style={pdfStyles.dateRange}>
              {dateFrom || "All time"} to {dateTo || "Present"}{"\n"}Generated {new Date().toLocaleDateString()}
            </Text>
          </View>

          <Text style={pdfStyles.sectionLabel}>VIP → Membership Funnel</Text>
          <View style={pdfStyles.statRow}>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{funnelStats?.totalOverviews ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Overviews Submitted</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{funnelStats?.recommended ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Recommended (Yes)</Text>
              <Text style={pdfStyles.statSub}>{funnelStats?.recommendationRate ?? 0}% of overviews</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{funnelStats?.graduated ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Potential Envoys Graduated</Text>
              <Text style={pdfStyles.statSub}>{funnelStats?.graduationRate ?? 0}% graduation rate</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{funnelStats?.overallConversionRate ?? 0}%</Text>
              <Text style={pdfStyles.statLabel}>Overall VIP → Member</Text>
              <Text style={pdfStyles.statSub}>End-to-end conversion</Text>
            </View>
          </View>

          <Text style={pdfStyles.sectionLabel}>New Converts</Text>
          <View style={pdfStyles.statRow}>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{ncStats?.total ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Total New Converts</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{ncStats?.completed ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Fully Discipled</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{ncStats?.trainingDone ?? 0}</Text>
              <Text style={pdfStyles.statLabel}>Training Completed</Text>
            </View>
            <View style={pdfStyles.statBox}>
              <Text style={pdfStyles.statValue}>{ncStats?.retentionPct ?? 0}%</Text>
              <Text style={pdfStyles.statLabel}>Retention Rate</Text>
            </View>
          </View>

          {chartImages && (chartImages.vipDecision || chartImages.vipFunnel || chartImages.ncType || chartImages.ncMonth) && (
            <>
              <Text style={pdfStyles.sectionLabel}>Visual Breakdown</Text>
              <View style={pdfStyles.chartRow}>
                <View style={pdfStyles.chartBox}>
                  <Text style={pdfStyles.chartTitle}>VIP Decision Split</Text>
                  {chartImages.vipDecision && <Image src={chartImages.vipDecision} style={pdfStyles.chartImage} />}
                </View>
                <View style={pdfStyles.chartBox}>
                  <Text style={pdfStyles.chartTitle}>VIP Funnel Stages</Text>
                  {chartImages.vipFunnel && <Image src={chartImages.vipFunnel} style={pdfStyles.chartImage} />}
                </View>
                <View style={pdfStyles.chartBox}>
                  <Text style={pdfStyles.chartTitle}>New Converts by Type</Text>
                  {chartImages.ncType && <Image src={chartImages.ncType} style={pdfStyles.chartImage} />}
                </View>
                <View style={pdfStyles.chartBox}>
                  <Text style={pdfStyles.chartTitle}>Monthly Reach</Text>
                  {chartImages.ncMonth && <Image src={chartImages.ncMonth} style={pdfStyles.chartImage} />}
                </View>
              </View>
            </>
          )}

          {aiSummary && (
            <View style={pdfStyles.summaryBox}>
              <Text style={pdfStyles.summaryLabel}>Period Summary</Text>
              <Text style={pdfStyles.summaryText}>{aiSummary}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export default SoulCareReportPDF;

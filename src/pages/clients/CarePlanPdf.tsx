import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { ModularCarePlan, CarePlanSection, Client } from '@/types';
import { format } from 'date-fns';

// ── Helpers ──

function fmtDate(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

// ── Brand Colors ──

const FOREST = '#2D5A3D';
const SAGE = '#7A9E7E';
const CREAM = '#FDF8F0';
const CHARCOAL = '#1A1A1A';
const MID_GRAY = '#666666';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: CHARCOAL,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  headerBrand: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 8,
    color: MID_GRAY,
    marginTop: 1,
  },
  docTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: 0.5,
  },
  // Accent line
  accentLine: {
    height: 3,
    backgroundColor: FOREST,
    marginHorizontal: 48,
    borderRadius: 2,
  },
  // Body
  body: {
    paddingHorizontal: 48,
    paddingTop: 20,
  },
  // Client details block
  clientBlock: {
    backgroundColor: CREAM,
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: SAGE,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    marginBottom: 8,
  },
  clientRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 4,
  },
  clientLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  clientValue: {
    fontSize: 10,
    color: CHARCOAL,
  },
  clientItem: {
    minWidth: 120,
  },
  // Plan meta
  planMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  planMetaItem: {},
  planMetaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  planMetaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: FOREST,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 10,
    color: CHARCOAL,
    lineHeight: 1.5,
    paddingHorizontal: 4,
  },
  sectionTimestamp: {
    fontSize: 7,
    color: MID_GRAY,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: SAGE,
    paddingHorizontal: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: MID_GRAY,
  },
  pageNumber: {
    fontSize: 7,
    color: MID_GRAY,
  },
});

// ── Props ──

interface CarePlanPdfProps {
  plan: ModularCarePlan;
  client: Client;
}

export default function CarePlanPdf({ plan, client }: CarePlanPdfProps) {
  const sections = [...plan.sections].sort((a, b) => a.order - b.order);

  return (
    <Document title={`Care Plan - ${client.firstName} ${client.lastName}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo.jpeg" style={{ width: 120, height: 'auto' }} />
            <Text style={s.headerSub}>ABN: 15 694 748 297</Text>
            <Text style={s.headerSub}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
          </View>
          <Text style={s.docTitle}>CARE PLAN</Text>
        </View>

        {/* Accent Line */}
        <View style={s.accentLine} />

        <View style={s.body}>
          {/* Client Details */}
          <View style={s.clientBlock}>
            <Text style={s.clientName}>
              {client.firstName} {client.lastName}
            </Text>
            <View style={s.clientRow}>
              <View style={s.clientItem}>
                <Text style={s.clientLabel}>Date of Birth</Text>
                <Text style={s.clientValue}>{fmtDate(client.dateOfBirth)}</Text>
              </View>
              <View style={s.clientItem}>
                <Text style={s.clientLabel}>NDIS Number</Text>
                <Text style={s.clientValue}>{client.ndisNumber}</Text>
              </View>
              <View style={s.clientItem}>
                <Text style={s.clientLabel}>Funding Type</Text>
                <Text style={s.clientValue}>{client.fundingType}</Text>
              </View>
            </View>
            <View style={s.clientRow}>
              <View style={s.clientItem}>
                <Text style={s.clientLabel}>Address</Text>
                <Text style={s.clientValue}>
                  {client.address}, {client.suburb} {client.postcode}
                </Text>
              </View>
              <View style={s.clientItem}>
                <Text style={s.clientLabel}>Phone</Text>
                <Text style={s.clientValue}>{client.phone}</Text>
              </View>
            </View>
          </View>

          {/* Plan Meta */}
          <View style={s.planMeta}>
            <View style={s.planMetaItem}>
              <Text style={s.planMetaLabel}>Plan Start</Text>
              <Text style={s.planMetaValue}>{fmtDate(client.planStartDate)}</Text>
            </View>
            <View style={s.planMetaItem}>
              <Text style={s.planMetaLabel}>Plan End</Text>
              <Text style={s.planMetaValue}>{fmtDate(client.planEndDate)}</Text>
            </View>
            <View style={s.planMetaItem}>
              <Text style={s.planMetaLabel}>Last Reviewed</Text>
              <Text style={s.planMetaValue}>{fmtDate(plan.lastReviewedDate)}</Text>
            </View>
            <View style={s.planMetaItem}>
              <Text style={s.planMetaLabel}>Next Review Due</Text>
              <Text style={s.planMetaValue}>{fmtDate(plan.nextReviewDueDate)}</Text>
            </View>
            {client.planManagerName && (
              <View style={s.planMetaItem}>
                <Text style={s.planMetaLabel}>Plan Manager</Text>
                <Text style={s.planMetaValue}>{client.planManagerName}</Text>
              </View>
            )}
          </View>

          {/* Sections */}
          {sections.map((section: CarePlanSection) => (
            <View key={section.id} style={s.section} wrap={false}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={s.sectionContent}>{section.content}</Text>
              <Text style={s.sectionTimestamp}>
                Last updated: {fmtDate(section.lastUpdated)}
                {section.generatedByAi ? ' (AI-generated)' : ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Thrive 4 Better | ABN 15 694 748 297 | 20 Zelkova Cct, Fraser Rise VIC 3336
          </Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

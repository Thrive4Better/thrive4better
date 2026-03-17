import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { ModularCarePlan, CarePlanSection, Client, CarePlanSectionType } from '@/types';
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
const LIGHT_GRAY = '#F5F5F5';
const BORDER = '#E0E0E0';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: CHARCOAL,
    paddingBottom: 70,
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  headerSub: {
    fontSize: 7.5,
    color: MID_GRAY,
    marginTop: 1,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  docSubtitle: {
    fontSize: 9,
    color: MID_GRAY,
    textAlign: 'right',
    marginTop: 2,
  },
  // Accent line
  accentLine: {
    height: 3,
    backgroundColor: FOREST,
    marginHorizontal: 40,
    borderRadius: 2,
  },
  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  // Section numbering
  sectionNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    marginBottom: 6,
    marginTop: 12,
  },
  subSectionNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    marginBottom: 4,
    marginTop: 8,
  },
  // Section header bar
  sectionHeader: {
    backgroundColor: FOREST,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 8,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subSectionHeader: {
    backgroundColor: SAGE,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 6,
    marginTop: 8,
  },
  subSectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Table styles
  table: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: CREAM,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    color: CHARCOAL,
  },
  tableCellBold: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
  },
  // Content text
  contentText: {
    fontSize: 9.5,
    color: CHARCOAL,
    lineHeight: 1.5,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  // Participant details table
  detailsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailsLabel: {
    width: '35%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    backgroundColor: CREAM,
  },
  detailsValue: {
    width: '65%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
    color: CHARCOAL,
  },
  // Sign-off
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: CHARCOAL,
    width: '60%',
    marginTop: 24,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: MID_GRAY,
    marginBottom: 16,
  },
  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: CHARCOAL,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 9,
    color: CHARCOAL,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: SAGE,
    paddingHorizontal: 40,
    paddingVertical: 10,
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
  confidential: {
    fontSize: 6.5,
    color: MID_GRAY,
    fontFamily: 'Helvetica-Oblique',
  },
});

// ── NDIS section types that get structured tables ──

const NDIS_STRUCTURED_SECTIONS: CarePlanSectionType[] = [
  'short_term_goals',
  'long_term_goals',
  'core_supports',
  'capacity_building_supports',
  'capital_supports',
  'carer_contacts',
  'behaviour_support',
  'sign_off',
];

// ── Helper: parse content into table rows ──
// Content is free-form text; we parse lines into columns separated by | or tabs

function parseContentRows(content: string): string[][] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Try pipe-delimited first
      if (line.includes('|')) {
        return line.split('|').map((c) => c.trim());
      }
      // Try tab-delimited
      if (line.includes('\t')) {
        return line.split('\t').map((c) => c.trim());
      }
      // Single column
      return [line];
    });
}

// ── Props ──

interface CarePlanPdfProps {
  plan: ModularCarePlan;
  client: Client;
}

export default function CarePlanPdf({ plan, client }: CarePlanPdfProps) {
  const sections = [...plan.sections].sort((a, b) => a.order - b.order);

  // Categorize sections by NDIS template order
  const participantSection = sections.find((s) => s.type === 'participant_details');
  const shortTermGoals = sections.find((s) => s.type === 'short_term_goals');
  const longTermGoals = sections.find((s) => s.type === 'long_term_goals');
  const goalsSection = sections.find((s) => s.type === 'goals_and_outcomes');
  const coreSupports = sections.find((s) => s.type === 'core_supports');
  const capacitySupports = sections.find((s) => s.type === 'capacity_building_supports');
  const capitalSupports = sections.find((s) => s.type === 'capital_supports');
  const carerContacts = sections.find((s) => s.type === 'carer_contacts');
  const behaviourSupport = sections.find((s) => s.type === 'behaviour_support');
  const riskAssessment = sections.find((s) => s.type === 'risk_assessment');
  const signOff = sections.find((s) => s.type === 'sign_off');

  // Remaining sections not covered by NDIS structure
  const structuredIds = new Set(
    [participantSection, shortTermGoals, longTermGoals, goalsSection,
     coreSupports, capacitySupports, capitalSupports, carerContacts,
     behaviourSupport, riskAssessment, signOff]
      .filter(Boolean)
      .map((s) => s!.id)
  );
  const otherSections = sections.filter((s) => !structuredIds.has(s.id));

  return (
    <Document title={`NDIS Support Plan - ${client.firstName} ${client.lastName}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Image src="/logo.jpeg" style={{ width: 100, height: 'auto' }} />
            <Text style={s.headerSub}>ABN: 15 694 748 297</Text>
            <Text style={s.headerSub}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
            <Text style={s.headerSub}>info@thrive4better.com.au</Text>
          </View>
          <View>
            <Text style={s.docTitle}>NDIS SUPPORT PLAN</Text>
            <Text style={s.docSubtitle}>Thrive 4 Better Pty Ltd</Text>
          </View>
        </View>

        {/* ── Accent Line ── */}
        <View style={s.accentLine} />

        <View style={s.body}>
          {/* ═══════════════════════════════════════════════════
              1. PARTICIPANT DETAILS
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>1. Participant Details</Text>
          </View>

          <View style={s.table}>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Name</Text>
              <Text style={s.detailsValue}>{client.firstName} {client.lastName}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>NDIS Number</Text>
              <Text style={s.detailsValue}>{client.ndisNumber}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Date of Birth</Text>
              <Text style={s.detailsValue}>{fmtDate(client.dateOfBirth)}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Address</Text>
              <Text style={s.detailsValue}>{client.address}, {client.suburb} {client.postcode}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Phone</Text>
              <Text style={s.detailsValue}>{client.phone}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Email</Text>
              <Text style={s.detailsValue}>{client.email}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Plan Start Date</Text>
              <Text style={s.detailsValue}>{fmtDate(client.planStartDate)}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Plan End Date</Text>
              <Text style={s.detailsValue}>{fmtDate(client.planEndDate)}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Plan Manager</Text>
              <Text style={s.detailsValue}>
                {client.planManagerName || '--'}
                {client.planManagerEmail ? ` (${client.planManagerEmail})` : ''}
              </Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Support Coordinator</Text>
              <Text style={s.detailsValue}>
                {client.supportCoordinatorName || '--'}
                {client.supportCoordinatorContact ? ` (${client.supportCoordinatorContact})` : ''}
              </Text>
            </View>
            <View style={{ ...s.detailsRow, borderBottomWidth: 0 }}>
              <Text style={s.detailsLabel}>Funding Type</Text>
              <Text style={s.detailsValue}>{client.fundingType}</Text>
            </View>
          </View>

          {/* Extra participant details section content if exists */}
          {participantSection && participantSection.content && !participantSection.content.startsWith('Enter participant') && (
            <Text style={s.contentText}>{participantSection.content}</Text>
          )}

          {/* ═══════════════════════════════════════════════════
              2. GOALS
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader} wrap={false}>
            <Text style={s.sectionTitle}>2. Goals</Text>
          </View>

          {/* 2.1 Short-Term Goals */}
          <View style={s.subSectionHeader} wrap={false}>
            <Text style={s.subSectionTitle}>2.1 Short-Term Goals (0-12 months)</Text>
          </View>
          {shortTermGoals && shortTermGoals.content ? (
            <GoalsTable content={shortTermGoals.content} />
          ) : goalsSection && goalsSection.content ? (
            <GoalsTable content={goalsSection.content} />
          ) : (
            <Text style={s.contentText}>No short-term goals documented.</Text>
          )}

          {/* 2.2 Long-Term Goals */}
          <View style={s.subSectionHeader} wrap={false}>
            <Text style={s.subSectionTitle}>2.2 Long-Term Goals (12+ months)</Text>
          </View>
          {longTermGoals && longTermGoals.content ? (
            <GoalsTable content={longTermGoals.content} />
          ) : (
            <Text style={s.contentText}>No long-term goals documented.</Text>
          )}

          {/* ═══════════════════════════════════════════════════
              3. SUPPORT NEEDS AND FUNDED SUPPORTS
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader} wrap={false}>
            <Text style={s.sectionTitle}>3. Support Needs and Funded Supports</Text>
          </View>

          {/* 3.1 Core Supports */}
          <View style={s.subSectionHeader} wrap={false}>
            <Text style={s.subSectionTitle}>3.1 Core Supports</Text>
          </View>
          {coreSupports && coreSupports.content ? (
            <SupportsTable content={coreSupports.content} />
          ) : (
            <Text style={s.contentText}>No core supports documented.</Text>
          )}

          {/* 3.2 Capacity Building Supports */}
          <View style={s.subSectionHeader} wrap={false}>
            <Text style={s.subSectionTitle}>3.2 Capacity Building Supports</Text>
          </View>
          {capacitySupports && capacitySupports.content ? (
            <SupportsTable content={capacitySupports.content} />
          ) : (
            <Text style={s.contentText}>No capacity building supports documented.</Text>
          )}

          {/* 3.3 Capital Supports */}
          <View style={s.subSectionHeader} wrap={false}>
            <Text style={s.subSectionTitle}>3.3 Capital Supports</Text>
          </View>
          {capitalSupports && capitalSupports.content ? (
            <SupportsTable content={capitalSupports.content} />
          ) : (
            <Text style={s.contentText}>No capital supports documented.</Text>
          )}

          {/* Support budget categories from client */}
          {client.supportCategories.length > 0 && (
            <View wrap={false}>
              <Text style={{ ...s.label, marginTop: 8, marginBottom: 4 }}>Budget Summary</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={{ ...s.tableHeaderCell, width: '50%' }}>Category</Text>
                  <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Allocated</Text>
                  <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Spent</Text>
                </View>
                {client.supportCategories.map((cat, i) => (
                  <View key={cat.categoryId} style={i === client.supportCategories.length - 1 ? s.tableRowLast : s.tableRow}>
                    <Text style={{ ...s.tableCell, width: '50%' }}>{cat.categoryName}</Text>
                    <Text style={{ ...s.tableCell, width: '25%' }}>${cat.allocatedBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</Text>
                    <Text style={{ ...s.tableCell, width: '25%' }}>${cat.spentAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════
              4. CARER AND KEY CONTACTS
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader} wrap={false}>
            <Text style={s.sectionTitle}>4. Carer and Key Contacts</Text>
          </View>

          {/* Allied Health Contacts from care plan */}
          {plan.alliedHealthContacts && plan.alliedHealthContacts.length > 0 && (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Name</Text>
                <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Role/Relationship</Text>
                <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Phone</Text>
                <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Email</Text>
              </View>
              {plan.alliedHealthContacts.map((contact, i) => (
                <View key={contact.id} style={i === plan.alliedHealthContacts.length - 1 ? s.tableRowLast : s.tableRow}>
                  <Text style={{ ...s.tableCell, width: '25%' }}>{contact.name}</Text>
                  <Text style={{ ...s.tableCell, width: '25%' }}>{contact.role}</Text>
                  <Text style={{ ...s.tableCell, width: '25%' }}>{contact.phone}</Text>
                  <Text style={{ ...s.tableCell, width: '25%' }}>{contact.email}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Emergency contact */}
          {client.emergencyContactName && (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={{ ...s.tableHeaderCell, width: '35%' }}>Emergency Contact</Text>
                <Text style={{ ...s.tableHeaderCell, width: '30%' }}>Relationship</Text>
                <Text style={{ ...s.tableHeaderCell, width: '35%' }}>Phone</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={{ ...s.tableCell, width: '35%' }}>{client.emergencyContactName}</Text>
                <Text style={{ ...s.tableCell, width: '30%' }}>Emergency Contact</Text>
                <Text style={{ ...s.tableCell, width: '35%' }}>{client.emergencyContactPhone}</Text>
              </View>
            </View>
          )}

          {/* Nominated contact */}
          {client.nominatedContactName && (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={{ ...s.tableHeaderCell, width: '35%' }}>Nominated Contact</Text>
                <Text style={{ ...s.tableHeaderCell, width: '30%' }}>Relationship</Text>
                <Text style={{ ...s.tableHeaderCell, width: '35%' }}>Phone</Text>
              </View>
              <View style={s.tableRowLast}>
                <Text style={{ ...s.tableCell, width: '35%' }}>{client.nominatedContactName}</Text>
                <Text style={{ ...s.tableCell, width: '30%' }}>{client.nominatedContactRelation || '--'}</Text>
                <Text style={{ ...s.tableCell, width: '35%' }}>{client.nominatedContactPhone || '--'}</Text>
              </View>
            </View>
          )}

          {carerContacts && carerContacts.content && (
            <Text style={s.contentText}>{carerContacts.content}</Text>
          )}

          {/* ═══════════════════════════════════════════════════
              5. RISK ASSESSMENT AND BEHAVIOUR SUPPORT
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader} wrap={false}>
            <Text style={s.sectionTitle}>5. Risk Assessment and Behaviour Support</Text>
          </View>

          {/* Behaviour Support Plan checkbox */}
          <View style={s.checkboxRow}>
            <View style={s.checkbox} />
            <Text style={s.checkboxLabel}>Behaviour Support Plan in place</Text>
          </View>

          {behaviourSupport && behaviourSupport.content && (
            <View wrap={false}>
              <Text style={{ ...s.label, marginTop: 6 }}>Behaviour Support Strategies</Text>
              <Text style={s.contentText}>{behaviourSupport.content}</Text>
            </View>
          )}

          {riskAssessment && riskAssessment.content && (
            <View wrap={false}>
              <Text style={{ ...s.label, marginTop: 6 }}>Risk Management Strategies</Text>
              <Text style={s.contentText}>{riskAssessment.content}</Text>
            </View>
          )}

          {plan.riskNotes && !riskAssessment?.content && (
            <View wrap={false}>
              <Text style={{ ...s.label, marginTop: 6 }}>Risk Notes</Text>
              <Text style={s.contentText}>{plan.riskNotes}</Text>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════
              Additional Sections (plan overview, daily routine, etc.)
             ═══════════════════════════════════════════════════ */}
          {otherSections.length > 0 && (
            <>
              <View style={s.sectionHeader} wrap={false}>
                <Text style={s.sectionTitle}>Additional Information</Text>
              </View>
              {otherSections.map((section) => (
                <View key={section.id} wrap={false} style={{ marginBottom: 10 }}>
                  <Text style={{ ...s.label, marginTop: 4 }}>{section.title}</Text>
                  <Text style={s.contentText}>{section.content}</Text>
                </View>
              ))}
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              6. REVIEW AND SIGN-OFF
             ═══════════════════════════════════════════════════ */}
          <View style={s.sectionHeader} wrap={false}>
            <Text style={s.sectionTitle}>6. Review and Sign-Off</Text>
          </View>

          <View wrap={false}>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Last Reviewed</Text>
              <Text style={s.detailsValue}>{fmtDate(plan.lastReviewedDate)}</Text>
            </View>
            <View style={s.detailsRow}>
              <Text style={s.detailsLabel}>Next Review Due</Text>
              <Text style={s.detailsValue}>{fmtDate(plan.nextReviewDueDate)}</Text>
            </View>

            {signOff && signOff.content && (
              <Text style={{ ...s.contentText, marginTop: 8 }}>{signOff.content}</Text>
            )}

            {/* Participant signature */}
            <Text style={{ ...s.label, marginTop: 20 }}>Participant / Nominee Acknowledgement</Text>
            <Text style={s.contentText}>
              I have reviewed and agree with the contents of this NDIS Support Plan. I understand the supports outlined and the goals we are working towards.
            </Text>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>Participant / Nominee Signature                                                           Date: ___/___/______</Text>

            {/* T4B Representative */}
            <Text style={{ ...s.label, marginTop: 12 }}>Thrive 4 Better Representative</Text>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>Melissa Manno - Director, Thrive 4 Better                                             Date: ___/___/______</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerText}>
              Thrive 4 Better Pty Ltd | ABN 15 694 748 297 | 20 Zelkova Cct, Fraser Rise VIC 3336
            </Text>
            <Text style={s.confidential}>CONFIDENTIAL - This document contains personal information protected under the Privacy Act 1988</Text>
          </View>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Goals Table Component ──

function GoalsTable({ content }: { content: string }) {
  const rows = parseContentRows(content);
  if (rows.length === 0) {
    return <Text style={s.contentText}>{content}</Text>;
  }

  // If content is simple bullet points (single column), render as numbered goals table
  const isSingleColumn = rows.every((r) => r.length === 1);

  if (isSingleColumn) {
    return (
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderCell, width: '8%' }}>#</Text>
          <Text style={{ ...s.tableHeaderCell, width: '52%' }}>Goal</Text>
          <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Strategies/Actions</Text>
          <Text style={{ ...s.tableHeaderCell, width: '15%' }}>Target Date</Text>
        </View>
        {rows.map((row, i) => {
          const text = row[0].replace(/^[-•*]\s*/, '');
          // Try to extract date from parenthetical
          const dateMatch = text.match(/\((?:Target:\s*)?([^)]+)\)/);
          const goalText = text.replace(/\s*\([^)]*\)\s*/g, '').replace(/,?\s*Status:\s*\w+\s*$/i, '');
          return (
            <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow}>
              <Text style={{ ...s.tableCell, width: '8%' }}>{i + 1}</Text>
              <Text style={{ ...s.tableCell, width: '52%' }}>{goalText}</Text>
              <Text style={{ ...s.tableCell, width: '25%' }}>--</Text>
              <Text style={{ ...s.tableCell, width: '15%' }}>{dateMatch?.[1] || '--'}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Multi-column: render as-is
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={{ ...s.tableHeaderCell, width: '8%' }}>#</Text>
        {rows[0].map((_, ci) => (
          <Text key={ci} style={{ ...s.tableHeaderCell, width: `${92 / rows[0].length}%` }}>
            {ci === 0 ? 'Goal' : ci === 1 ? 'Strategies/Actions' : 'Target Date'}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow}>
          <Text style={{ ...s.tableCell, width: '8%' }}>{i + 1}</Text>
          {row.map((cell, ci) => (
            <Text key={ci} style={{ ...s.tableCell, width: `${92 / row.length}%` }}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Supports Table Component ──

function SupportsTable({ content }: { content: string }) {
  const rows = parseContentRows(content);
  if (rows.length === 0) {
    return <Text style={s.contentText}>{content}</Text>;
  }

  const isSingleColumn = rows.every((r) => r.length === 1);

  if (isSingleColumn) {
    return (
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderCell, width: '35%' }}>Support Item</Text>
          <Text style={{ ...s.tableHeaderCell, width: '25%' }}>Provider</Text>
          <Text style={{ ...s.tableHeaderCell, width: '20%' }}>Frequency</Text>
          <Text style={{ ...s.tableHeaderCell, width: '20%' }}>Budget</Text>
        </View>
        {rows.map((row, i) => {
          const text = row[0].replace(/^[-•*]\s*/, '');
          return (
            <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow}>
              <Text style={{ ...s.tableCell, width: '35%' }}>{text}</Text>
              <Text style={{ ...s.tableCell, width: '25%' }}>--</Text>
              <Text style={{ ...s.tableCell, width: '20%' }}>--</Text>
              <Text style={{ ...s.tableCell, width: '20%' }}>--</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Multi-column
  const headers = ['Support Item', 'Provider', 'Frequency', 'Budget Allocated'];
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {headers.slice(0, Math.max(rows[0].length, 1)).map((h, i) => (
          <Text key={i} style={{ ...s.tableHeaderCell, width: `${100 / Math.max(rows[0].length, 1)}%` }}>{h}</Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={i === rows.length - 1 ? s.tableRowLast : s.tableRow}>
          {row.map((cell, ci) => (
            <Text key={ci} style={{ ...s.tableCell, width: `${100 / row.length}%` }}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { RemittanceAdvice, ContractorInvoice } from '@/types';
import { format } from 'date-fns';

function fmtDate(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

function fmtCurrency(amount: number): string {
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

const FOREST = '#2D5A3D';
const LIGHT_GREEN = '#E8F0EC';
const CREAM = '#FDF8F0';
const CHARCOAL = '#1A1A1A';
const MID_GRAY = '#666666';
const SAGE = '#7A9E7E';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: CHARCOAL,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 9,
    color: MID_GRAY,
    marginTop: 2,
  },
  accentLine: {
    height: 3,
    backgroundColor: FOREST,
    marginHorizontal: 48,
    borderRadius: 2,
  },
  body: {
    paddingHorizontal: 48,
    paddingTop: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 40,
  },
  fromToBlock: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  detail: {
    fontSize: 9,
    color: MID_GRAY,
    lineHeight: 1.4,
  },
  // Details table
  detailsTable: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
  },
  detailLabelCell: {
    width: '40%',
    backgroundColor: LIGHT_GREEN,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  detailValueCell: {
    width: '60%',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  detailLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
  },
  detailValue: {
    fontSize: 9,
  },
  // Invoices table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: FOREST,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: CREAM,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 9,
  },
  tdBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Totals
  totalsWrapper: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalsBlock: {
    minWidth: 260,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    gap: 32,
  },
  totalLabel: {
    fontSize: 9,
    color: MID_GRAY,
  },
  totalValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 3,
  },
  totalPaidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
    backgroundColor: FOREST,
    padding: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  totalPaidLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  totalPaidValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  // Notes
  notesBox: {
    backgroundColor: CREAM,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: SAGE,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: MID_GRAY,
    lineHeight: 1.5,
  },
  // Issued by
  issuedByBox: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  issuedByTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    marginBottom: 4,
  },
  issuedByText: {
    fontSize: 9,
    color: MID_GRAY,
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
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 8,
    color: MID_GRAY,
    textAlign: 'center',
  },
});

interface RemittanceAdvicePdfProps {
  remittance: RemittanceAdvice;
  invoices: ContractorInvoice[];
  contractorName: string;
  contractorAddress?: string;
  contractorAbn?: string;
}

export default function RemittanceAdvicePdf({ remittance, invoices, contractorName, contractorAddress, contractorAbn }: RemittanceAdvicePdfProps) {
  return (
    <Document title={`Remittance Advice ${remittance.remittanceNumber}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>REMITTANCE ADVICE</Text>
            <Text style={s.subtitle}>Payment Confirmation to Contractor</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: FOREST }}>{remittance.remittanceNumber}</Text>
            <Text style={{ fontSize: 9, color: MID_GRAY, marginTop: 2 }}>Issued: {fmtDate(remittance.createdAt)}</Text>
          </View>
        </View>

        <View style={s.accentLine} />

        <View style={s.body}>
          {/* From / To */}
          <View style={s.metaRow}>
            <View style={s.fromToBlock}>
              <Text style={s.sectionLabel}>From</Text>
              <Text style={s.name}>Thrive 4 Better Pty Ltd</Text>
              <Text style={s.detail}>ABN: 15 694 748 297</Text>
              <Text style={s.detail}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
              <Text style={s.detail}>info@thrive4better.com</Text>
              <Text style={s.detail}>0422 745 229</Text>
            </View>
            <View style={s.fromToBlock}>
              <Text style={s.sectionLabel}>To (Contractor)</Text>
              <Text style={s.name}>{contractorName}</Text>
              {contractorAbn && <Text style={s.detail}>ABN: {contractorAbn}</Text>}
              {contractorAddress && <Text style={s.detail}>{contractorAddress}</Text>}
            </View>
          </View>

          {/* Payment Details Table */}
          <View style={s.detailsTable}>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Remittance Number</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{remittance.remittanceNumber}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Payment Date</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{fmtDate(remittance.paymentDate)}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Payment Method</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{remittance.paymentMethod}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Payment Reference</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{remittance.paymentReference}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Period Covered</Text></View>
              <View style={s.detailValueCell}>
                <Text style={s.detailValue}>{fmtDate(remittance.periodStart)} - {fmtDate(remittance.periodEnd)}</Text>
              </View>
            </View>
          </View>

          {/* Invoices Paid Table */}
          <View style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: FOREST, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Invoices Paid
            </Text>
          </View>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '25%' }]}>Invoice #</Text>
              <Text style={[s.th, { width: '25%' }]}>Period</Text>
              <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>Subtotal</Text>
              <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>GST</Text>
              <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Total</Text>
            </View>
            {invoices.map((inv, i) => (
              <View key={inv.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.td, { width: '25%' }]}>{inv.invoiceNumber}</Text>
                <Text style={[s.td, { width: '25%' }]}>{fmtDate(inv.periodStart)} - {fmtDate(inv.periodEnd)}</Text>
                <Text style={[s.td, { width: '16%', textAlign: 'right' }]}>{fmtCurrency(inv.subtotal)}</Text>
                <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{fmtCurrency(inv.gstAmount)}</Text>
                <Text style={[s.tdBold, { width: '20%', textAlign: 'right' }]}>{fmtCurrency(inv.total)}</Text>
              </View>
            ))}
          </View>

          {/* Payment Summary */}
          <View style={s.totalsWrapper}>
            <View style={s.totalsBlock}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal</Text>
                <Text style={s.totalValue}>{fmtCurrency(remittance.subtotal)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>GST</Text>
                <Text style={s.totalValue}>{fmtCurrency(remittance.gstAmount)}</Text>
              </View>
              {remittance.withholdingTax > 0 && (
                <View style={s.totalRow}>
                  <Text style={[s.totalLabel, { color: '#DC3545' }]}>Withholding Tax</Text>
                  <Text style={[s.totalValue, { color: '#DC3545' }]}>-{fmtCurrency(remittance.withholdingTax)}</Text>
                </View>
              )}
              <View style={s.totalDivider} />
              <View style={s.totalPaidRow}>
                <Text style={s.totalPaidLabel}>Total Paid</Text>
                <Text style={s.totalPaidValue}>{fmtCurrency(remittance.totalPaid)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {remittance.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesTitle}>Notes</Text>
              <Text style={s.notesText}>{remittance.notes}</Text>
            </View>
          )}

          {/* Issued By */}
          <View style={s.issuedByBox}>
            <Text style={s.issuedByTitle}>Issued By</Text>
            <Text style={s.issuedByText}>Melissa Manno, Director</Text>
            <Text style={s.issuedByText}>Thrive 4 Better Pty Ltd</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Please retain this remittance advice for your records. | Thrive 4 Better Pty Ltd | ABN 15 694 748 297
          </Text>
        </View>
      </Page>
    </Document>
  );
}

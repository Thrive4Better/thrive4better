import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem, Client } from '@/types';
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

function fmtCurrency(amount: number): string {
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
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
    fontSize: 9,
    color: CHARCOAL,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  headerBrand: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 8,
    color: MID_GRAY,
    marginTop: 1,
  },
  invoiceTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: 1,
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
    paddingTop: 24,
  },
  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 40,
  },
  clientBlock: {
    flex: 1,
  },
  metaBlock: {
    minWidth: 180,
    flexDirection: 'column',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  clientName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 9,
    color: MID_GRAY,
    lineHeight: 1.4,
  },
  // Table
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
  thDesc: { width: '32%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  thCode: { width: '16%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  thHrs: { width: '10%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thRate: { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thGst: { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thAmt: { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  tdDesc: { width: '32%', fontSize: 9 },
  tdCode: { width: '16%', fontSize: 8, fontFamily: 'Courier' },
  tdHrs: { width: '10%', fontSize: 9, textAlign: 'right' },
  tdRate: { width: '14%', fontSize: 9, textAlign: 'right' },
  tdGst: { width: '14%', fontSize: 8, textAlign: 'right', color: MID_GRAY },
  tdAmt: { width: '14%', fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  // Totals
  totalsWrapper: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  totalsBlock: {
    minWidth: 240,
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
  totalLabelBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalValueBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  amountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
    backgroundColor: FOREST,
    padding: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  amountDueLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
  },
  amountDueValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  // Payment box
  paymentBox: {
    backgroundColor: CREAM,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: SAGE,
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 24,
  },
  paymentItem: {},
  paymentItemLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MID_GRAY,
    marginBottom: 1,
  },
  paymentItemValue: {
    fontSize: 9,
    color: CHARCOAL,
  },
  // Notes
  notesLabel: {
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
    marginBottom: 16,
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

// ── Props ──
interface InvoicePdfProps {
  invoice: Invoice;
  client: Client;
}

export default function InvoicePdf({ invoice, client }: InvoicePdfProps) {
  const gstAmount = invoice.gstApplicable ? invoice.gstAmount : 0;
  const amountDue = invoice.total;

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>Thrive 4 Better</Text>
            <Text style={s.headerSub}>ABN: 15 694 748 297</Text>
            <Text style={s.headerSub}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
          </View>
          <Text style={s.invoiceTitle}>TAX INVOICE</Text>
        </View>

        {/* Accent Line */}
        <View style={s.accentLine} />

        <View style={s.body}>
          {/* Bill To + Meta */}
          <View style={s.metaRow}>
            <View style={s.clientBlock}>
              <Text style={s.metaLabel}>Bill To</Text>
              <Text style={s.clientName}>{client.firstName} {client.lastName}</Text>
              <Text style={s.clientDetail}>{client.address}</Text>
              <Text style={s.clientDetail}>{client.suburb} {client.postcode}</Text>
              <Text style={s.clientDetail}>NDIS Number: {client.ndisNumber}</Text>
              {client.email && <Text style={s.clientDetail}>{client.email}</Text>}
            </View>
            <View style={s.metaBlock}>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Invoice Number</Text>
                <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Issue Date</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.invoiceDate)}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Due Date</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
              </View>
              {invoice.referenceNumber && (
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Reference</Text>
                  <Text style={s.metaValue}>{invoice.referenceNumber}</Text>
                </View>
              )}
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Billing Period</Text>
                <Text style={s.metaValue}>
                  {fmtDate(invoice.periodStart)} - {fmtDate(invoice.periodEnd)}
                </Text>
              </View>
            </View>
          </View>

          {/* Line Items Table */}
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.thDesc}>Description</Text>
              <Text style={s.thCode}>NDIS Code</Text>
              <Text style={s.thHrs}>Hours</Text>
              <Text style={s.thRate}>Unit Price</Text>
              <Text style={s.thGst}>GST</Text>
              <Text style={s.thAmt}>Amount</Text>
            </View>
            {invoice.lineItems.map((item: InvoiceLineItem, i: number) => (
              <View key={item.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.tdDesc}>{item.description}</Text>
                <Text style={s.tdCode}>{item.ndisLineItemCode}</Text>
                <Text style={s.tdHrs}>{item.hours.toString()}</Text>
                <Text style={s.tdRate}>{fmtCurrency(item.rate)}</Text>
                <Text style={s.tdGst}>{invoice.gstApplicable ? '10%' : 'BAS Excluded'}</Text>
                <Text style={s.tdAmt}>{fmtCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={s.totalsWrapper}>
            <View style={s.totalsBlock}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal</Text>
                <Text style={s.totalValue}>{fmtCurrency(invoice.subtotal)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>GST</Text>
                <Text style={s.totalValue}>{fmtCurrency(gstAmount)}</Text>
              </View>
              <View style={s.totalDivider} />
              <View style={s.totalRow}>
                <Text style={s.totalLabelBold}>Total AUD</Text>
                <Text style={s.totalValueBold}>{fmtCurrency(invoice.total)}</Text>
              </View>
              <View style={s.amountDueRow}>
                <Text style={s.amountDueLabel}>Amount Due</Text>
                <Text style={s.amountDueValue}>{fmtCurrency(amountDue)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Details */}
          <View style={s.paymentBox}>
            <Text style={s.paymentTitle}>Payment Details</Text>
            <View style={s.paymentRow}>
              <View style={s.paymentItem}>
                <Text style={s.paymentItemLabel}>BSB</Text>
                <Text style={s.paymentItemValue}>063-123</Text>
              </View>
              <View style={s.paymentItem}>
                <Text style={s.paymentItemLabel}>Account Number</Text>
                <Text style={s.paymentItemValue}>1234 5678</Text>
              </View>
              <View style={s.paymentItem}>
                <Text style={s.paymentItemLabel}>Account Name</Text>
                <Text style={s.paymentItemValue}>Thrive 4 Better Pty Ltd</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {invoice.notesToClient ? (
            <View>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{invoice.notesToClient}</Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Thrive 4 Better | ABN 15 694 748 297 | www.thrive4better.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

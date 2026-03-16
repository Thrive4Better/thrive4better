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

// ── Styles ──
const FOREST = '#1B5E4E';
const SAGE_PALE = '#EAF3EE';
const CHARCOAL = '#1f2937';
const MID_GRAY = '#6b7280';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: CHARCOAL,
    paddingBottom: 80,
  },
  // Header
  header: {
    backgroundColor: FOREST,
    paddingHorizontal: 36,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerInvoice: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  // Body
  body: {
    paddingHorizontal: 36,
    paddingTop: 20,
  },
  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaBlock: {},
  metaLabel: {
    fontSize: 7,
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  // Client box
  clientBox: {
    backgroundColor: SAGE_PALE,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  clientLabel: {
    fontSize: 7,
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 8,
    color: MID_GRAY,
    lineHeight: 1.4,
  },
  // Reference
  referenceRow: {
    marginBottom: 16,
  },
  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: SAGE_PALE,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  thDate: { width: '12%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY },
  thDesc: { width: '26%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY },
  thCode: { width: '16%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY },
  thCat: { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY },
  thHrs: { width: '8%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY, textAlign: 'right' },
  thRate: { width: '12%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY, textAlign: 'right' },
  thAmt: { width: '12%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY, textAlign: 'right' },
  tdDate: { width: '12%', fontSize: 8 },
  tdDesc: { width: '26%', fontSize: 8 },
  tdCode: { width: '16%', fontSize: 7, fontFamily: 'Courier' },
  tdCat: { width: '14%', fontSize: 8 },
  tdHrs: { width: '8%', fontSize: 8, textAlign: 'right' },
  tdRate: { width: '12%', fontSize: 8, textAlign: 'right' },
  tdAmt: { width: '12%', fontSize: 8, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  // Totals
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: MID_GRAY,
    width: 100,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 100,
    textAlign: 'right',
  },
  totalGrandRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    paddingVertical: 5,
    borderTopWidth: 1.5,
    borderTopColor: FOREST,
    marginTop: 2,
  },
  totalGrandLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    width: 100,
  },
  totalGrandValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    width: 100,
    textAlign: 'right',
  },
  // Payment box
  paymentBox: {
    backgroundColor: SAGE_PALE,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 24,
  },
  paymentItem: {},
  paymentItemLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: CHARCOAL,
    marginBottom: 1,
  },
  paymentItemValue: {
    fontSize: 8,
    color: MID_GRAY,
  },
  // Notes
  notesLabel: {
    fontSize: 7,
    color: MID_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 8,
    color: CHARCOAL,
    lineHeight: 1.4,
    marginBottom: 16,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 36,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: MID_GRAY,
  },
});

// ── Props ──
interface InvoicePdfProps {
  invoice: Invoice;
  client: Client;
}

export default function InvoicePdf({ invoice, client }: InvoicePdfProps) {
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerBrand}>Thrive 4 Better</Text>
            <Text style={s.headerSub}>ABN: 12 345 678 901</Text>
            <Text style={s.headerSub}>123 Smith Street, Fitzroy VIC 3065</Text>
          </View>
          <Text style={s.headerInvoice}>INVOICE</Text>
        </View>

        <View style={s.body}>
          {/* Invoice Meta */}
          <View style={s.metaRow}>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Invoice Number</Text>
              <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Invoice Date</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.invoiceDate)}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Due Date</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
            </View>
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Billing Period</Text>
              <Text style={s.metaValue}>
                {fmtDate(invoice.periodStart)} - {fmtDate(invoice.periodEnd)}
              </Text>
            </View>
          </View>

          {/* Client Block */}
          <View style={s.clientBox}>
            <Text style={s.clientLabel}>Bill To</Text>
            <Text style={s.clientName}>{client.firstName} {client.lastName}</Text>
            <Text style={s.clientDetail}>{client.address}</Text>
            <Text style={s.clientDetail}>{client.suburb} {client.postcode}</Text>
            <Text style={s.clientDetail}>NDIS Number: {client.ndisNumber}</Text>
            {client.email && <Text style={s.clientDetail}>{client.email}</Text>}
          </View>

          {/* Reference */}
          {invoice.referenceNumber ? (
            <View style={s.referenceRow}>
              <Text style={s.metaLabel}>Reference / PO Number</Text>
              <Text style={s.metaValue}>{invoice.referenceNumber}</Text>
            </View>
          ) : null}

          {/* Line Items Table */}
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.thDate}>Date</Text>
              <Text style={s.thDesc}>Description</Text>
              <Text style={s.thCode}>NDIS Code</Text>
              <Text style={s.thCat}>Category</Text>
              <Text style={s.thHrs}>Hours</Text>
              <Text style={s.thRate}>Rate</Text>
              <Text style={s.thAmt}>Amount</Text>
            </View>
            {invoice.lineItems.map((item: InvoiceLineItem) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.tdDate}>{fmtDate(item.date)}</Text>
                <Text style={s.tdDesc}>{item.description}</Text>
                <Text style={s.tdCode}>{item.ndisLineItemCode}</Text>
                <Text style={s.tdCat}>{item.supportCategory}</Text>
                <Text style={s.tdHrs}>{item.hours.toString()}</Text>
                <Text style={s.tdRate}>{fmtCurrency(item.rate)}</Text>
                <Text style={s.tdAmt}>{fmtCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={s.totalsSection}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{fmtCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.gstApplicable && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>GST (10%)</Text>
                <Text style={s.totalValue}>{fmtCurrency(invoice.gstAmount)}</Text>
              </View>
            )}
            <View style={s.totalGrandRow}>
              <Text style={s.totalGrandLabel}>Total</Text>
              <Text style={s.totalGrandValue}>{fmtCurrency(invoice.total)}</Text>
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
          <Text style={s.footerText}>ABN: 12 345 678 901 | NDIS Registration Number: 4-XXXXXXX</Text>
          <Text style={s.footerText}>Payment Terms: 14 days</Text>
        </View>
      </Page>
    </Document>
  );
}

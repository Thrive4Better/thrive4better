import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ContractorInvoice } from '@/types';
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
  invoiceTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    letterSpacing: 1,
  },
  invoiceSubtitle: {
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
  // From/To columns
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
  // Invoice details table
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
  // Line items table
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
  thDesc: { width: '46%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  thHrs: { width: '14%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thRate: { width: '20%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thAmt: { width: '20%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  tdDesc: { width: '46%', fontSize: 9 },
  tdHrs: { width: '14%', fontSize: 9, textAlign: 'right' },
  tdRate: { width: '20%', fontSize: 9, textAlign: 'right' },
  tdAmt: { width: '20%', fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
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
  // GST badge
  gstBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  gstBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
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
  // Warning box
  warningBox: {
    backgroundColor: '#FEF3CD',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F0AD4E',
  },
  warningText: {
    fontSize: 8,
    color: '#856404',
    lineHeight: 1.4,
  },
  // Declaration
  declarationBox: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  declarationTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: FOREST,
    marginBottom: 6,
  },
  declarationText: {
    fontSize: 8,
    color: MID_GRAY,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    marginTop: 8,
  },
  signatureLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 4,
    marginTop: 16,
  },
  signatureLabel: {
    fontSize: 7,
    color: MID_GRAY,
    marginTop: 4,
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

interface ContractorInvoicePdfProps {
  invoice: ContractorInvoice;
  carerName: string;
}

export default function ContractorInvoicePdf({ invoice, carerName }: ContractorInvoicePdfProps) {
  return (
    <Document title={`Contractor Invoice ${invoice.invoiceNumber}`} author={carerName}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.invoiceTitle}>TAX INVOICE</Text>
            <Text style={s.invoiceSubtitle}>Contractor Invoice to Thrive 4 Better</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: FOREST }}>{invoice.invoiceNumber}</Text>
            <Text style={{ fontSize: 9, color: MID_GRAY, marginTop: 2 }}>Issued: {fmtDate(invoice.invoiceDate)}</Text>
          </View>
        </View>

        <View style={s.accentLine} />

        <View style={s.body}>
          {/* From / To */}
          <View style={s.metaRow}>
            <View style={s.fromToBlock}>
              <Text style={s.sectionLabel}>From (Contractor)</Text>
              <Text style={s.name}>{carerName}</Text>
              {invoice.contractorAbn && <Text style={s.detail}>ABN: {invoice.contractorAbn}</Text>}
              {invoice.contractorAddress && <Text style={s.detail}>{invoice.contractorAddress}</Text>}
            </View>
            <View style={s.fromToBlock}>
              <Text style={s.sectionLabel}>To</Text>
              <Text style={s.name}>Thrive 4 Better Pty Ltd</Text>
              <Text style={s.detail}>ABN: 15 694 748 297</Text>
              <Text style={s.detail}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
              <Text style={s.detail}>info@thrive4better.com</Text>
              <Text style={s.detail}>0422 745 229</Text>
            </View>
          </View>

          {/* Invoice Details Table */}
          <View style={s.detailsTable}>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Invoice Number</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{invoice.invoiceNumber}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Invoice Date</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{fmtDate(invoice.invoiceDate)}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Due Date</Text></View>
              <View style={s.detailValueCell}><Text style={s.detailValue}>{fmtDate(invoice.dueDate)}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailLabelCell}><Text style={s.detailLabel}>Service Period</Text></View>
              <View style={s.detailValueCell}>
                <Text style={s.detailValue}>{fmtDate(invoice.periodStart)} - {fmtDate(invoice.periodEnd)}</Text>
              </View>
            </View>
          </View>

          {/* GST Badge */}
          <View style={[s.gstBadge, { backgroundColor: invoice.registeredForGst ? '#D4EDDA' : '#FFF3CD' }]}>
            <Text style={[s.gstBadgeText, { color: invoice.registeredForGst ? '#155724' : '#856404' }]}>
              {invoice.registeredForGst ? 'GST Registered - 10% GST Applicable' : 'Not Registered for GST - No GST Charged'}
            </Text>
          </View>

          {/* Line Items Table */}
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={s.thDesc}>Description</Text>
              <Text style={s.thHrs}>Hours/Qty</Text>
              <Text style={s.thRate}>Rate</Text>
              <Text style={s.thAmt}>Amount</Text>
            </View>
            {invoice.lineItems.map((item, i) => (
              <View key={item.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.tdDesc}>{item.description}</Text>
                <Text style={s.tdHrs}>{item.hours.toString()}</Text>
                <Text style={s.tdRate}>{fmtCurrency(item.rate)}</Text>
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
                <Text style={s.totalLabel}>GST (10%)</Text>
                <Text style={s.totalValue}>{fmtCurrency(invoice.gstAmount)}</Text>
              </View>
              <View style={s.totalDivider} />
              <View style={s.amountDueRow}>
                <Text style={s.amountDueLabel}>Total Amount Due</Text>
                <Text style={s.amountDueValue}>{fmtCurrency(invoice.total)}</Text>
              </View>
            </View>
          </View>

          {/* ABN Withholding Warning */}
          {!invoice.contractorAbn && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>
                WARNING: No ABN has been provided. Under the Australian Taxation Office (ATO) rules,
                the payer (Thrive 4 Better) is required to withhold 47% from this payment for tax purposes
                (Pay As You Go withholding - no ABN quoted). Please provide a valid ABN to avoid this withholding.
              </Text>
            </View>
          )}

          {/* Payment Details */}
          {(invoice.contractorBsb || invoice.contractorAccountNumber) && (
            <View style={s.paymentBox}>
              <Text style={s.paymentTitle}>Payment Details</Text>
              <View style={s.paymentRow}>
                {invoice.contractorBankName && (
                  <View>
                    <Text style={s.paymentItemLabel}>Bank</Text>
                    <Text style={s.paymentItemValue}>{invoice.contractorBankName}</Text>
                  </View>
                )}
                {invoice.contractorAccountName && (
                  <View>
                    <Text style={s.paymentItemLabel}>Account Name</Text>
                    <Text style={s.paymentItemValue}>{invoice.contractorAccountName}</Text>
                  </View>
                )}
                {invoice.contractorBsb && (
                  <View>
                    <Text style={s.paymentItemLabel}>BSB</Text>
                    <Text style={s.paymentItemValue}>{invoice.contractorBsb}</Text>
                  </View>
                )}
                {invoice.contractorAccountNumber && (
                  <View>
                    <Text style={s.paymentItemLabel}>Account Number</Text>
                    <Text style={s.paymentItemValue}>{invoice.contractorAccountNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          {invoice.notes && (
            <View>
              <Text style={s.notesLabel}>Notes</Text>
              <Text style={s.notesText}>{invoice.notes}</Text>
            </View>
          )}

          {/* Declaration */}
          <View style={s.declarationBox}>
            <Text style={s.declarationTitle}>Declaration</Text>
            <Text style={s.declarationText}>
              I declare that the information on this invoice is true and correct. The services described
              were provided during the period stated. I understand that providing false or misleading
              information may result in penalties.
            </Text>
            <View style={s.signatureRow}>
              <View style={{ flex: 1 }}>
                <View style={s.signatureLine} />
                <Text style={s.signatureLabel}>Contractor Signature</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.signatureLine} />
                <Text style={s.signatureLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This invoice is issued to Thrive 4 Better Pty Ltd | ABN 15 694 748 297 | Please retain for your records
          </Text>
        </View>
      </Page>
    </Document>
  );
}

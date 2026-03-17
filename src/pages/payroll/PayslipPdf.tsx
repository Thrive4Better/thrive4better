import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { PayRunLineItem } from '@/types';

const FOREST = '#2D5A3D';
const SAGE = '#7A9E7E';
const CREAM = '#FDF8F0';
const CHARCOAL = '#1A1A1A';
const MID_GRAY = '#666666';

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
  headerLeft: { flexDirection: 'column', gap: 2 },
  headerBrand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: FOREST },
  headerSub: { fontSize: 8, color: MID_GRAY, marginTop: 1 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: FOREST, letterSpacing: 1 },
  accentLine: { height: 3, backgroundColor: FOREST, marginHorizontal: 48, borderRadius: 2 },
  body: { paddingHorizontal: 48, paddingTop: 24 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 40 },
  empBlock: { flex: 1 },
  metaBlock: { minWidth: 180, flexDirection: 'column', gap: 6 },
  metaItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MID_GRAY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  empName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  empDetail: { fontSize: 9, color: MID_GRAY, lineHeight: 1.4 },
  // Earnings table
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: FOREST, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableHeader: { flexDirection: 'row', backgroundColor: FOREST, paddingVertical: 8, paddingHorizontal: 8 },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E8', paddingVertical: 7, paddingHorizontal: 8 },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E8', paddingVertical: 7, paddingHorizontal: 8, backgroundColor: CREAM },
  td: { fontSize: 9 },
  tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Summary
  summaryBox: { backgroundColor: CREAM, borderRadius: 6, padding: 14, marginTop: 20, borderLeftWidth: 3, borderLeftColor: SAGE },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 9, color: MID_GRAY },
  summaryValue: { fontSize: 9, textAlign: 'right' },
  summaryLabelBold: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  summaryValueBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E8E8E8', marginVertical: 3 },
  netPayBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: FOREST, padding: 10, borderRadius: 4, marginTop: 6 },
  netPayLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  netPayValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: SAGE, paddingHorizontal: 48, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 8, color: MID_GRAY, textAlign: 'center' },
});

interface PayslipPdfProps {
  lineItem: PayRunLineItem;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
}

export default function PayslipPdf({ lineItem, periodStart, periodEnd, paymentDate }: PayslipPdfProps) {
  return (
    <Document title={`Payslip - ${lineItem.carerName}`} author="Thrive 4 Better">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src="/logo.jpeg" style={{ width: 120, height: 'auto' }} />
            <Text style={s.headerSub}>ABN: 15 694 748 297</Text>
            <Text style={s.headerSub}>20 Zelkova Cct, Fraser Rise VIC 3336</Text>
          </View>
          <Text style={s.title}>PAYSLIP</Text>
        </View>

        <View style={s.accentLine} />

        <View style={s.body}>
          {/* Employee + Meta */}
          <View style={s.metaRow}>
            <View style={s.empBlock}>
              <Text style={s.metaLabel}>Employee</Text>
              <Text style={s.empName}>{lineItem.carerName}</Text>
              <Text style={s.empDetail}>
                {lineItem.isSubcontractor ? 'Subcontractor' : 'Employee'}
              </Text>
            </View>
            <View style={s.metaBlock}>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Pay Period</Text>
                <Text style={s.metaValue}>{fmtDate(periodStart)} - {fmtDate(periodEnd)}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Payment Date</Text>
                <Text style={s.metaValue}>{fmtDate(paymentDate)}</Text>
              </View>
            </View>
          </View>

          {/* Earnings Table */}
          <Text style={s.sectionTitle}>Earnings</Text>
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '40%' }]}>Description</Text>
              <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>Hours</Text>
              <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Rate</Text>
              <Text style={[s.th, { width: '25%', textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={s.tableRow}>
              <Text style={[s.td, { width: '40%' }]}>Ordinary Hours</Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{lineItem.hoursWorked.toString()}</Text>
              <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>{fmtCurrency(lineItem.hourlyRate)}</Text>
              <Text style={[s.tdBold, { width: '25%', textAlign: 'right' }]}>{fmtCurrency(lineItem.grossPay)}</Text>
            </View>
            {lineItem.allowances > 0 && (
              <View style={s.tableRowAlt}>
                <Text style={[s.td, { width: '40%' }]}>Allowances</Text>
                <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>-</Text>
                <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>-</Text>
                <Text style={[s.tdBold, { width: '25%', textAlign: 'right' }]}>{fmtCurrency(lineItem.allowances)}</Text>
              </View>
            )}
          </View>

          {/* Deductions */}
          {(lineItem.paygWithholding > 0 || lineItem.deductions > 0) && (
            <>
              <Text style={s.sectionTitle}>Deductions</Text>
              <View>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: '60%' }]}>Description</Text>
                  <Text style={[s.th, { width: '40%', textAlign: 'right' }]}>Amount</Text>
                </View>
                {lineItem.paygWithholding > 0 && (
                  <View style={s.tableRow}>
                    <Text style={[s.td, { width: '60%' }]}>PAYG Withholding</Text>
                    <Text style={[s.tdBold, { width: '40%', textAlign: 'right' }]}>{fmtCurrency(lineItem.paygWithholding)}</Text>
                  </View>
                )}
                {lineItem.deductions > 0 && (
                  <View style={s.tableRowAlt}>
                    <Text style={[s.td, { width: '60%' }]}>Other Deductions</Text>
                    <Text style={[s.tdBold, { width: '40%', textAlign: 'right' }]}>{fmtCurrency(lineItem.deductions)}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Super */}
          {lineItem.superAmount > 0 && (
            <>
              <Text style={s.sectionTitle}>Superannuation</Text>
              <View>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: '60%' }]}>Description</Text>
                  <Text style={[s.th, { width: '40%', textAlign: 'right' }]}>Amount</Text>
                </View>
                <View style={s.tableRow}>
                  <Text style={[s.td, { width: '60%' }]}>Super Guarantee (11.5%)</Text>
                  <Text style={[s.tdBold, { width: '40%', textAlign: 'right' }]}>{fmtCurrency(lineItem.superAmount)}</Text>
                </View>
              </View>
            </>
          )}

          {/* Summary */}
          <View style={s.summaryBox}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Gross Pay</Text>
              <Text style={s.summaryValue}>{fmtCurrency(lineItem.grossPay)}</Text>
            </View>
            {lineItem.allowances > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Allowances</Text>
                <Text style={s.summaryValue}>{fmtCurrency(lineItem.allowances)}</Text>
              </View>
            )}
            {lineItem.paygWithholding > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>PAYG Withholding</Text>
                <Text style={s.summaryValue}>-{fmtCurrency(lineItem.paygWithholding)}</Text>
              </View>
            )}
            {lineItem.deductions > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Other Deductions</Text>
                <Text style={s.summaryValue}>-{fmtCurrency(lineItem.deductions)}</Text>
              </View>
            )}
            <View style={s.divider} />
            <View style={s.netPayBox}>
              <Text style={s.netPayLabel}>Net Pay</Text>
              <Text style={s.netPayValue}>{fmtCurrency(lineItem.netPay)}</Text>
            </View>
          </View>

          {/* Super note */}
          {lineItem.superAmount > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 8, color: MID_GRAY, lineHeight: 1.5 }}>
                Superannuation of {fmtCurrency(lineItem.superAmount)} is paid in addition to your net pay into your nominated super fund.
              </Text>
            </View>
          )}
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

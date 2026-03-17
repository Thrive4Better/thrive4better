import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, addDays, addWeeks, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { Save, CheckCircle, Download, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { useStore } from '@/stores/useStore';
import { formatCurrency, generateId } from '@/lib/utils';
import PayslipPdf from './PayslipPdf';
import type { PayRun as PayRunType, PayRunLineItem, PayFrequency } from '@/types';

const STORAGE_KEY = 't4b_payRuns';

function loadPayRuns(): PayRunType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePayRuns(runs: PayRunType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

// Australian 2024-25 PAYG tax table (simplified weekly brackets)
function calculateWeeklyPAYG(weeklyGross: number): number {
  // Simplified progressive tax calculation
  const annualised = weeklyGross * 52;
  let tax = 0;
  if (annualised <= 18200) {
    tax = 0;
  } else if (annualised <= 45000) {
    tax = (annualised - 18200) * 0.16;
  } else if (annualised <= 120000) {
    tax = 4288 + (annualised - 45000) * 0.30;
  } else if (annualised <= 180000) {
    tax = 26788 + (annualised - 120000) * 0.37;
  } else {
    tax = 49000 + (annualised - 180000) * 0.45;
  }
  // Return weekly amount
  return Math.round((tax / 52) * 100) / 100;
}

function calculatePAYG(grossPay: number, frequency: PayFrequency): number {
  let weeklyEquivalent = grossPay;
  if (frequency === 'fortnightly') weeklyEquivalent = grossPay / 2;
  else if (frequency === 'monthly') weeklyEquivalent = (grossPay * 12) / 52;

  const weeklyTax = calculateWeeklyPAYG(weeklyEquivalent);

  if (frequency === 'fortnightly') return Math.round(weeklyTax * 2 * 100) / 100;
  if (frequency === 'monthly') return Math.round((weeklyTax * 52) / 12 * 100) / 100;
  return weeklyTax;
}

const SUPER_RATE = 0.115; // 11.5%

export default function PayRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { carers, timesheets, shifts } = useStore();

  const existingRuns = useMemo(() => loadPayRuns(), []);
  const existingRun = id && id !== 'new' ? existingRuns.find((r) => r.id === id) : null;

  const [frequency, setFrequency] = useState<PayFrequency>(existingRun?.frequency || 'fortnightly');

  // Default period: previous complete period
  const defaultPeriodEnd = existingRun
    ? existingRun.periodEnd
    : format(endOfWeek(subWeeks(new Date(), frequency === 'weekly' ? 1 : 2), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const defaultPeriodStart = existingRun
    ? existingRun.periodStart
    : format(
        startOfWeek(
          frequency === 'weekly'
            ? subWeeks(new Date(), 1)
            : frequency === 'fortnightly'
            ? subWeeks(new Date(), 2)
            : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          { weekStartsOn: 1 },
        ),
        'yyyy-MM-dd',
      );

  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [status, setStatus] = useState<PayRunType['status']>(existingRun?.status || 'Draft');

  // Build line items from approved timesheets in the period
  const autoLineItems = useMemo<PayRunLineItem[]>(() => {
    if (existingRun) return existingRun.lineItems;

    const approvedTimesheets = timesheets.filter((ts) => ts.status === 'approved');
    const periodShifts = shifts.filter((s) => s.date >= periodStart && s.date <= periodEnd);
    const relevantTimesheets = approvedTimesheets.filter((ts) =>
      periodShifts.some((s) => s.id === ts.shiftId),
    );

    // Group by carer
    const carerMap = new Map<string, { hours: number; rate: number }>();
    for (const ts of relevantTimesheets) {
      const shift = periodShifts.find((s) => s.id === ts.shiftId);
      if (!shift) continue;
      const existing = carerMap.get(shift.carerId) || { hours: 0, rate: shift.hourlyRate || 38 };
      existing.hours += ts.totalHours || 0;
      if (shift.hourlyRate) existing.rate = shift.hourlyRate;
      carerMap.set(shift.carerId, existing);
    }

    // Also include carers with shifts but no timesheets (use shift hours)
    for (const shift of periodShifts) {
      if (!carerMap.has(shift.carerId) && shift.status === 'Completed') {
        const existing = carerMap.get(shift.carerId) || { hours: 0, rate: shift.hourlyRate || 38 };
        existing.hours += shift.hours || 0;
        carerMap.set(shift.carerId, existing);
      }
    }

    const items: PayRunLineItem[] = [];
    carerMap.forEach((data, carerId) => {
      const carer = carers.find((c) => c.id === carerId);
      if (!carer) return;
      const grossPay = Math.round(data.hours * data.rate * 100) / 100;
      const isSub = carer.isSubcontractor || false;
      const superAmount = isSub ? 0 : Math.round(grossPay * SUPER_RATE * 100) / 100;
      const paygWithholding = isSub ? 0 : calculatePAYG(grossPay, frequency);
      const netPay = Math.round((grossPay - paygWithholding) * 100) / 100;

      items.push({
        carerId,
        carerName: `${carer.firstName} ${carer.lastName}`,
        isSubcontractor: isSub,
        hoursWorked: data.hours,
        hourlyRate: data.rate,
        grossPay,
        superAmount,
        paygWithholding,
        allowances: 0,
        deductions: 0,
        netPay,
      });
    });

    return items;
  }, [existingRun, timesheets, shifts, carers, periodStart, periodEnd, frequency]);

  const [lineItems, setLineItems] = useState<PayRunLineItem[]>(autoLineItems);

  const recalcItem = (item: PayRunLineItem): PayRunLineItem => {
    const grossPay = Math.round(item.hoursWorked * item.hourlyRate * 100) / 100;
    const superAmount = item.isSubcontractor ? 0 : Math.round(grossPay * SUPER_RATE * 100) / 100;
    const paygWithholding = item.isSubcontractor ? 0 : calculatePAYG(grossPay, frequency);
    const netPay = Math.round((grossPay + item.allowances - item.deductions - paygWithholding) * 100) / 100;
    return { ...item, grossPay, superAmount, paygWithholding, netPay };
  };

  const updateLineItem = useCallback(
    (idx: number, field: keyof PayRunLineItem, value: number) => {
      setLineItems((prev) => {
        const updated = [...prev];
        updated[idx] = recalcItem({ ...updated[idx], [field]: value });
        return updated;
      });
    },
    [frequency],
  );

  const totals = useMemo(() => {
    return {
      totalGross: lineItems.reduce((s, i) => s + i.grossPay, 0),
      totalSuper: lineItems.reduce((s, i) => s + i.superAmount, 0),
      totalPAYG: lineItems.reduce((s, i) => s + i.paygWithholding, 0),
      totalNet: lineItems.reduce((s, i) => s + i.netPay, 0),
    };
  }, [lineItems]);

  const employees = lineItems.filter((i) => !i.isSubcontractor);
  const subcontractors = lineItems.filter((i) => i.isSubcontractor);

  const handleSave = (newStatus?: PayRunType['status']) => {
    const payRun: PayRunType = {
      id: existingRun?.id || generateId(),
      periodStart,
      periodEnd,
      frequency,
      status: newStatus || status,
      ...totals,
      lineItems,
      processedAt: newStatus === 'Completed' ? new Date().toISOString() : existingRun?.processedAt,
      createdAt: existingRun?.createdAt || new Date().toISOString(),
    };

    const runs = loadPayRuns().filter((r) => r.id !== payRun.id);
    runs.push(payRun);
    savePayRuns(runs);

    if (newStatus === 'Completed') {
      setStatus('Completed');
      toast.success('Pay run approved and processed');
    } else {
      toast.success('Pay run saved as draft');
    }
  };

  const handleDelete = () => {
    if (!existingRun) return;
    if (!confirm('Delete this pay run?')) return;
    const runs = loadPayRuns().filter((r) => r.id !== existingRun.id);
    savePayRuns(runs);
    toast.success('Pay run deleted');
    navigate('/payroll');
  };

  const isLocked = status === 'Completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/payroll')} className="p-2 rounded-lg hover:bg-sage-pale transition-colors">
            <ArrowLeft size={20} className="text-mid-gray" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">
              {existingRun ? `Pay Run - ${format(new Date(periodStart), 'dd MMM')} to ${format(new Date(periodEnd), 'dd MMM yyyy')}` : 'New Pay Run'}
            </h1>
            <p className="text-sm text-mid-gray mt-1">
              {status === 'Completed' ? 'Completed' : 'Configure pay period and review line items'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {existingRun && status === 'Draft' && (
            <button onClick={handleDelete} className="btn-ghost text-red-600 flex items-center gap-2">
              <Trash2 size={16} />
              Delete
            </button>
          )}
          {!isLocked && (
            <>
              <button onClick={() => handleSave()} className="btn-secondary flex items-center gap-2">
                <Save size={16} />
                Save Draft
              </button>
              <button
                onClick={() => handleSave('Completed')}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Approve & Process
              </button>
            </>
          )}
        </div>
      </div>

      {/* Period Settings */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-charcoal mb-4">Pay Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PayFrequency)}
              disabled={isLocked}
              className="input-field"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              disabled={isLocked}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              disabled={isLocked}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Employees Section */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-sage-pale">
          <h2 className="text-base font-semibold text-charcoal">Employees</h2>
          <p className="text-xs text-mid-gray">PAYG and superannuation apply</p>
        </div>
        {employees.length === 0 ? (
          <div className="p-8 text-center text-sm text-mid-gray">
            No employee line items. Approved timesheets within the period will auto-populate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header text-right">Hours</th>
                  <th className="table-header text-right">Rate</th>
                  <th className="table-header text-right">Gross</th>
                  <th className="table-header text-right">Super (11.5%)</th>
                  <th className="table-header text-right">PAYG</th>
                  <th className="table-header text-right">Allowances</th>
                  <th className="table-header text-right">Deductions</th>
                  <th className="table-header text-right">Net Pay</th>
                  {isLocked && <th className="table-header">Payslip</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((item, idx) => {
                  const realIdx = lineItems.indexOf(item);
                  return (
                    <tr key={item.carerId} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                      <td className="table-cell text-sm font-medium text-charcoal">{item.carerName}</td>
                      <td className="table-cell text-right">
                        {isLocked ? (
                          <span className="text-sm">{item.hoursWorked}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.5"
                            value={item.hoursWorked}
                            onChange={(e) => updateLineItem(realIdx, 'hoursWorked', parseFloat(e.target.value) || 0)}
                            className="input-field w-20 text-right text-sm"
                          />
                        )}
                      </td>
                      <td className="table-cell text-right">
                        {isLocked ? (
                          <span className="text-sm">{formatCurrency(item.hourlyRate)}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={item.hourlyRate}
                            onChange={(e) => updateLineItem(realIdx, 'hourlyRate', parseFloat(e.target.value) || 0)}
                            className="input-field w-24 text-right text-sm"
                          />
                        )}
                      </td>
                      <td className="table-cell text-sm text-right">{formatCurrency(item.grossPay)}</td>
                      <td className="table-cell text-sm text-right text-teal-700">{formatCurrency(item.superAmount)}</td>
                      <td className="table-cell text-sm text-right text-amber-700">{formatCurrency(item.paygWithholding)}</td>
                      <td className="table-cell text-right">
                        {isLocked ? (
                          <span className="text-sm">{formatCurrency(item.allowances)}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={item.allowances}
                            onChange={(e) => updateLineItem(realIdx, 'allowances', parseFloat(e.target.value) || 0)}
                            className="input-field w-24 text-right text-sm"
                          />
                        )}
                      </td>
                      <td className="table-cell text-right">
                        {isLocked ? (
                          <span className="text-sm">{formatCurrency(item.deductions)}</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={item.deductions}
                            onChange={(e) => updateLineItem(realIdx, 'deductions', parseFloat(e.target.value) || 0)}
                            className="input-field w-24 text-right text-sm"
                          />
                        )}
                      </td>
                      <td className="table-cell text-sm text-right font-semibold text-forest">{formatCurrency(item.netPay)}</td>
                      {isLocked && (
                        <td className="table-cell">
                          <PDFDownloadLink
                            document={
                              <PayslipPdf
                                lineItem={item}
                                periodStart={periodStart}
                                periodEnd={periodEnd}
                                paymentDate={existingRun?.processedAt || new Date().toISOString()}
                              />
                            }
                            fileName={`payslip-${item.carerName.replace(/\s+/g, '-')}-${periodEnd}.pdf`}
                            className="text-forest hover:underline text-sm flex items-center gap-1"
                          >
                            {({ loading }) =>
                              loading ? '...' : (
                                <>
                                  <Download size={14} />
                                  PDF
                                </>
                              )
                            }
                          </PDFDownloadLink>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subcontractors Section */}
      {subcontractors.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-sage-pale">
            <h2 className="text-base font-semibold text-charcoal">Subcontractors</h2>
            <p className="text-xs text-mid-gray">No PAYG or super -- they invoice separately</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header text-right">Hours</th>
                  <th className="table-header text-right">Rate</th>
                  <th className="table-header text-right">Gross / Invoice Amount</th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.map((item) => (
                  <tr key={item.carerId} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                    <td className="table-cell text-sm font-medium text-charcoal">{item.carerName}</td>
                    <td className="table-cell text-sm text-right">{item.hoursWorked}</td>
                    <td className="table-cell text-sm text-right">{formatCurrency(item.hourlyRate)}</td>
                    <td className="table-cell text-sm text-right font-semibold">{formatCurrency(item.grossPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals Summary */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-charcoal mb-4">Pay Run Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-sage-pale/30 rounded-lg">
            <p className="text-xs text-mid-gray">Total Gross</p>
            <p className="text-lg font-bold text-charcoal">{formatCurrency(totals.totalGross)}</p>
          </div>
          <div className="p-3 bg-sage-pale/30 rounded-lg">
            <p className="text-xs text-mid-gray">Total Super</p>
            <p className="text-lg font-bold text-teal-700">{formatCurrency(totals.totalSuper)}</p>
          </div>
          <div className="p-3 bg-sage-pale/30 rounded-lg">
            <p className="text-xs text-mid-gray">Total PAYG</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.totalPAYG)}</p>
          </div>
          <div className="p-3 bg-forest/10 rounded-lg">
            <p className="text-xs text-mid-gray">Total Net Pay</p>
            <p className="text-lg font-bold text-forest">{formatCurrency(totals.totalNet)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Scale, CheckCircle2, Circle, Link2, Unlink, AlertTriangle,
  Calendar, ChevronDown, ArrowRight, Zap,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import { cn, formatCurrency, generateId } from '@/lib/utils';

// ── Types ──

interface ReconciliationEntry {
  id: string;
  date: string;
  description: string;
  amount: number; // positive = debit, negative = credit
  reference: string;
  matched: boolean;
  matchedWith?: string;
}

interface ReconciliationSession {
  id: string;
  accountCode: string;
  accountName: string;
  periodStart: string;
  periodEnd: string;
  bankEntries: ReconciliationEntry[];
  bookEntries: ReconciliationEntry[];
  status: 'in_progress' | 'reconciled';
  reconciledAt?: string;
  createdAt: string;
}

interface AccountOption {
  code: string;
  name: string;
}

function getAccountsFromStorage(): AccountOption[] {
  try {
    const saved = localStorage.getItem('t4b_chart_of_accounts');
    if (!saved) return [];
    const accounts = JSON.parse(saved) as { code: string; name: string; isArchived: boolean; type: string }[];
    return accounts.filter((a) => !a.isArchived && a.type === 'Asset').map((a) => ({ code: a.code, name: a.name }));
  } catch {
    return [];
  }
}

function getTransactionsFromStorage(): { id: string; date: string; description: string; debit: number; credit: number; accountCode: string; reference: string; reconciled: boolean }[] {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// ── Component ──

export default function BankReconciliation() {
  const [sessions, setSessions] = useState<ReconciliationSession[]>(() => {
    const saved = localStorage.getItem('t4b_bank_reconciliation');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem('t4b_bank_reconciliation', JSON.stringify(sessions)); }, [sessions]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [selectedBankEntry, setSelectedBankEntry] = useState<string | null>(null);
  const [selectedBookEntry, setSelectedBookEntry] = useState<string | null>(null);

  const accountOptions = useMemo(() => getAccountsFromStorage(), []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const startReconciliation = () => {
    if (!selectedAccount) { toast.error('Select an account'); return; }
    const acct = accountOptions.find((a) => a.code === selectedAccount);
    const transactions = getTransactionsFromStorage().filter(
      (t) => t.accountCode === selectedAccount
    ).filter((t) => {
      try {
        const d = parseISO(t.date);
        return d >= parseISO(periodStart) && d <= parseISO(periodEnd);
      } catch { return false; }
    });

    const bookEntries: ReconciliationEntry[] = transactions.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.debit - t.credit,
      reference: t.reference,
      matched: false,
    }));

    const session: ReconciliationSession = {
      id: generateId(),
      accountCode: selectedAccount,
      accountName: acct?.name || selectedAccount,
      periodStart,
      periodEnd,
      bankEntries: [],
      bookEntries,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => [...prev, session]);
    setActiveSessionId(session.id);
    toast.success('Reconciliation started. Add bank statement entries on the left to match.');
  };

  const addBankEntry = () => {
    if (!activeSession) return;
    const entry: ReconciliationEntry = {
      id: generateId(),
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      amount: 0,
      reference: '',
      matched: false,
    };
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? { ...s, bankEntries: [...s.bankEntries, entry] }
        : s
      )
    );
  };

  const updateBankEntry = (entryId: string, field: keyof ReconciliationEntry, value: string | number) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? { ...s, bankEntries: s.bankEntries.map((e) => e.id === entryId ? { ...e, [field]: value } : e) }
        : s
      )
    );
  };

  const removeBankEntry = (entryId: string) => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? { ...s, bankEntries: s.bankEntries.filter((e) => e.id !== entryId) }
        : s
      )
    );
  };

  const matchEntries = () => {
    if (!selectedBankEntry || !selectedBookEntry || !activeSession) return;
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? {
            ...s,
            bankEntries: s.bankEntries.map((e) =>
              e.id === selectedBankEntry ? { ...e, matched: true, matchedWith: selectedBookEntry } : e
            ),
            bookEntries: s.bookEntries.map((e) =>
              e.id === selectedBookEntry ? { ...e, matched: true, matchedWith: selectedBankEntry } : e
            ),
          }
        : s
      )
    );
    setSelectedBankEntry(null);
    setSelectedBookEntry(null);
    toast.success('Entries matched');
  };

  const unmatchEntry = (entryId: string, side: 'bank' | 'book') => {
    if (!activeSession) return;
    const entry = side === 'bank'
      ? activeSession.bankEntries.find((e) => e.id === entryId)
      : activeSession.bookEntries.find((e) => e.id === entryId);
    if (!entry || !entry.matchedWith) return;

    const partnerId = entry.matchedWith;
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? {
            ...s,
            bankEntries: s.bankEntries.map((e) =>
              (e.id === entryId || e.id === partnerId) ? { ...e, matched: false, matchedWith: undefined } : e
            ),
            bookEntries: s.bookEntries.map((e) =>
              (e.id === entryId || e.id === partnerId) ? { ...e, matched: false, matchedWith: undefined } : e
            ),
          }
        : s
      )
    );
    toast.success('Match removed');
  };

  const autoMatch = () => {
    if (!activeSession) return;
    let matchCount = 0;
    const updatedBank = [...activeSession.bankEntries];
    const updatedBook = [...activeSession.bookEntries];

    for (const bankEntry of updatedBank) {
      if (bankEntry.matched) continue;
      // Find matching book entry by amount and close date
      const matchIdx = updatedBook.findIndex((bookEntry) => {
        if (bookEntry.matched) return false;
        if (Math.abs(bankEntry.amount - bookEntry.amount) > 0.01) return false;
        // Date within 3 days
        try {
          const bankDate = parseISO(bankEntry.date).getTime();
          const bookDate = parseISO(bookEntry.date).getTime();
          return Math.abs(bankDate - bookDate) <= 3 * 24 * 60 * 60 * 1000;
        } catch { return false; }
      });

      if (matchIdx >= 0) {
        bankEntry.matched = true;
        bankEntry.matchedWith = updatedBook[matchIdx].id;
        updatedBook[matchIdx].matched = true;
        updatedBook[matchIdx].matchedWith = bankEntry.id;
        matchCount++;
      }
    }

    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? { ...s, bankEntries: updatedBank, bookEntries: updatedBook }
        : s
      )
    );
    toast.success(`Auto-matched ${matchCount} entries`);
  };

  const markReconciled = () => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) => s.id === activeSession.id
        ? { ...s, status: 'reconciled', reconciledAt: new Date().toISOString() }
        : s
      )
    );
    toast.success('Period marked as reconciled');
  };

  // Summary for active session
  const summary = useMemo(() => {
    if (!activeSession) return { bankTotal: 0, bookTotal: 0, matchedCount: 0, unmatchedBank: 0, unmatchedBook: 0, difference: 0 };
    const bankTotal = activeSession.bankEntries.reduce((s, e) => s + e.amount, 0);
    const bookTotal = activeSession.bookEntries.reduce((s, e) => s + e.amount, 0);
    const matchedCount = activeSession.bankEntries.filter((e) => e.matched).length;
    const unmatchedBank = activeSession.bankEntries.filter((e) => !e.matched).length;
    const unmatchedBook = activeSession.bookEntries.filter((e) => !e.matched).length;
    return { bankTotal, bookTotal, matchedCount, unmatchedBank, unmatchedBook, difference: bankTotal - bookTotal };
  }, [activeSession]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Bank Reconciliation</h1>
          <p className="text-sm text-mid-gray mt-1">Match bank statement entries with book entries</p>
        </div>
      </div>

      {/* Setup / Select Session */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Start New Reconciliation</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-mid-gray mb-1">Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="input-field">
              <option value="">Select account...</option>
              {accountOptions.map((a) => (
                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-mid-gray mb-1">Period Start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-mid-gray mb-1">Period End</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
          </div>
          <button onClick={startReconciliation} className="btn-primary">Start Reconciliation</button>
        </div>

        {/* Previous sessions */}
        {sessions.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-charcoal mb-3">Previous Reconciliations</h3>
            <div className="space-y-2">
              {sessions.slice().reverse().slice(0, 10).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                    activeSessionId === s.id ? 'bg-sage-pale border border-forest/30' : 'hover:bg-gray-50 border border-gray-200'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">{s.accountName}</p>
                    <p className="text-xs text-mid-gray">
                      {format(parseISO(s.periodStart), 'dd MMM')} - {format(parseISO(s.periodEnd), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    s.status === 'reconciled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {s.status === 'reconciled' ? 'Reconciled' : 'In Progress'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Reconciliation */}
      {activeSession && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-5 gap-4">
            <div className="card p-4">
              <p className="text-xs font-medium text-mid-gray">Bank Statement Total</p>
              <p className="text-lg font-bold text-charcoal mt-1">{formatCurrency(summary.bankTotal)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-mid-gray">Book Total</p>
              <p className="text-lg font-bold text-charcoal mt-1">{formatCurrency(summary.bookTotal)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-mid-gray">Matched</p>
              <p className="text-lg font-bold text-green-700 mt-1">{summary.matchedCount} pairs</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-mid-gray">Unmatched</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{summary.unmatchedBank + summary.unmatchedBook} entries</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-mid-gray">Difference</p>
              <p className={cn('text-lg font-bold mt-1', Math.abs(summary.difference) < 0.01 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(summary.difference)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={autoMatch} className="btn-ghost flex items-center gap-2">
              <Zap size={16} />
              Auto-Match
            </button>
            {selectedBankEntry && selectedBookEntry && (
              <button onClick={matchEntries} className="btn-primary flex items-center gap-2">
                <Link2 size={16} />
                Match Selected
              </button>
            )}
            {activeSession.status !== 'reconciled' && (
              <button onClick={markReconciled} className="btn-primary ml-auto flex items-center gap-2">
                <CheckCircle2 size={16} />
                Mark as Reconciled
              </button>
            )}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Bank Statement (left) */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-800">Bank Statement Entries</h3>
                <button onClick={addBankEntry} className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1">
                  + Add Entry
                </button>
              </div>
              {activeSession.bankEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-mid-gray">No bank statement entries yet.</p>
                  <button onClick={addBankEntry} className="text-sm text-forest font-medium mt-2 hover:underline">
                    Add your first entry
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeSession.bankEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        'p-3 transition-colors cursor-pointer',
                        entry.matched ? 'bg-green-50' : 'hover:bg-blue-50/30',
                        selectedBankEntry === entry.id && 'ring-2 ring-inset ring-forest'
                      )}
                      onClick={() => !entry.matched && setSelectedBankEntry(entry.id)}
                    >
                      <div className="flex items-start gap-2">
                        {entry.matched
                          ? <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          : <Circle size={16} className="text-mid-gray mt-0.5 flex-shrink-0" />
                        }
                        <div className="flex-1 space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(e) => updateBankEntry(entry.id, 'date', e.target.value)}
                              className="input-field text-xs py-1 px-2"
                              disabled={entry.matched}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={entry.amount || ''}
                              onChange={(e) => updateBankEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="input-field text-xs py-1 px-2 w-28 text-right"
                              placeholder="Amount"
                              disabled={entry.matched}
                            />
                          </div>
                          <input
                            type="text"
                            value={entry.description}
                            onChange={(e) => updateBankEntry(entry.id, 'description', e.target.value)}
                            className="input-field text-xs py-1 px-2 w-full"
                            placeholder="Description"
                            disabled={entry.matched}
                          />
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={entry.reference}
                              onChange={(e) => updateBankEntry(entry.id, 'reference', e.target.value)}
                              className="input-field text-xs py-1 px-2 w-32"
                              placeholder="Reference"
                              disabled={entry.matched}
                            />
                            <div className="flex items-center gap-1">
                              {entry.matched && (
                                <button onClick={() => unmatchEntry(entry.id, 'bank')} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                                  <Unlink size={12} />
                                  Unmatch
                                </button>
                              )}
                              {!entry.matched && (
                                <button onClick={() => removeBankEntry(entry.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Book Entries (right) */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-sage-pale border-b border-sage/30">
                <h3 className="text-sm font-bold text-forest">Book Entries (from Transactions)</h3>
              </div>
              {activeSession.bookEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-mid-gray">No book entries found for this period and account.</p>
                  <p className="text-xs text-mid-gray mt-1">Add transactions in the Transactions page first.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeSession.bookEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        'p-3 transition-colors cursor-pointer',
                        entry.matched ? 'bg-green-50' : 'hover:bg-sage-pale/30',
                        selectedBookEntry === entry.id && 'ring-2 ring-inset ring-forest'
                      )}
                      onClick={() => !entry.matched && setSelectedBookEntry(entry.id)}
                    >
                      <div className="flex items-start gap-2">
                        {entry.matched
                          ? <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          : <Circle size={16} className="text-mid-gray mt-0.5 flex-shrink-0" />
                        }
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-mid-gray">{format(parseISO(entry.date), 'dd MMM yyyy')}</span>
                            <span className={cn('text-sm font-bold', entry.amount >= 0 ? 'text-green-700' : 'text-red-600')}>
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                          <p className="text-sm text-charcoal mt-0.5">{entry.description}</p>
                          {entry.reference && (
                            <p className="text-xs text-mid-gray mt-0.5">Ref: {entry.reference}</p>
                          )}
                          {entry.matched && (
                            <button onClick={() => unmatchEntry(entry.id, 'book')} className="text-xs text-red-600 hover:underline flex items-center gap-1 mt-1">
                              <Unlink size={12} />
                              Unmatch
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reconciliation status */}
          {activeSession.status === 'reconciled' && (
            <div className="card p-6 bg-green-50 border-green-200 flex items-center gap-4">
              <CheckCircle2 size={24} className="text-green-700" />
              <div>
                <p className="text-sm font-bold text-green-800">Period Reconciled</p>
                <p className="text-xs text-green-700">
                  Reconciled on {activeSession.reconciledAt ? format(parseISO(activeSession.reconciledAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          )}

          {Math.abs(summary.difference) > 0.01 && activeSession.status !== 'reconciled' && (
            <div className="card p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-700" />
              <p className="text-sm text-amber-800">
                There is a difference of <strong>{formatCurrency(Math.abs(summary.difference))}</strong> between bank and book entries. Resolve all unmatched entries before reconciling.
              </p>
            </div>
          )}
        </>
      )}

      {!activeSession && sessions.length === 0 && (
        <EmptyState
          icon={Scale}
          title="No reconciliations yet"
          description="Select an account and period above to start your first bank reconciliation."
        />
      )}
    </div>
  );
}

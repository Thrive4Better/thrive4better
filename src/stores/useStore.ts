import { create } from 'zustand';
import type {
  Client, Carer, Shift, Invoice, CarePlan, NdisRate, ClientDocument,
  SessionNote, IncidentReport, Timesheet, ComplianceRecord, ClaimSubmission,
} from '@/types';
import { getNextInvoiceNumber } from '@/lib/utils';
import * as db from '@/lib/supabase-data';

interface AppState {
  // Data
  clients: Client[];
  carers: Carer[];
  shifts: Shift[];
  invoices: Invoice[];
  carePlans: CarePlan[];
  ndisRates: NdisRate[];
  documents: ClientDocument[];
  sessionNotes: SessionNote[];
  incidentReports: IncidentReport[];
  timesheets: Timesheet[];
  complianceRecords: ComplianceRecord[];
  claimSubmissions: ClaimSubmission[];

  // State
  isInitialized: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Carer actions
  addCarer: (carer: Omit<Carer, 'id' | 'createdAt'>) => Promise<void>;
  updateCarer: (id: string, data: Partial<Carer>) => Promise<void>;
  deleteCarer: (id: string) => Promise<void>;

  // Shift actions
  addShift: (shift: Omit<Shift, 'id' | 'createdAt'>) => Promise<void>;
  updateShift: (id: string, data: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;

  // Invoice actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // Care plan actions
  updateCarePlan: (id: string, data: Partial<CarePlan>) => Promise<void>;
  addCarePlan: (plan: Omit<CarePlan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // NDIS rates
  updateNdisRate: (id: string, data: Partial<NdisRate>) => Promise<void>;

  // Documents
  addDocument: (doc: Omit<ClientDocument, 'id'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  // Session notes
  addSessionNote: (note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SessionNote>;
  updateSessionNote: (id: string, data: Partial<SessionNote>) => Promise<void>;
  deleteSessionNote: (id: string) => Promise<void>;

  // Incident reports
  addIncidentReport: (report: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IncidentReport>;
  updateIncidentReport: (id: string, data: Partial<IncidentReport>) => Promise<void>;
  deleteIncidentReport: (id: string) => Promise<void>;

  // Timesheets
  addTimesheet: (ts: Omit<Timesheet, 'id' | 'createdAt'>) => Promise<Timesheet>;
  updateTimesheet: (id: string, data: Partial<Timesheet>) => Promise<void>;
  deleteTimesheet: (id: string) => Promise<void>;

  // Compliance records
  addComplianceRecord: (record: Omit<ComplianceRecord, 'id' | 'createdAt'>) => Promise<ComplianceRecord>;
  updateComplianceRecord: (id: string, data: Partial<ComplianceRecord>) => Promise<void>;
  deleteComplianceRecord: (id: string) => Promise<void>;

  // Claim submissions
  addClaimSubmission: (claim: Omit<ClaimSubmission, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ClaimSubmission>;
  updateClaimSubmission: (id: string, data: Partial<ClaimSubmission>) => Promise<void>;
  deleteClaimSubmission: (id: string) => Promise<void>;

  // Helpers
  getClientById: (id: string) => Client | undefined;
  getCarerById: (id: string) => Carer | undefined;
  getShiftsByClient: (clientId: string) => Shift[];
  getShiftsByCarer: (carerId: string) => Shift[];
  getInvoicesByClient: (clientId: string) => Invoice[];
  getCarePlanByClient: (clientId: string) => CarePlan | undefined;
  getDocumentsByClient: (clientId: string) => ClientDocument[];
  getSessionNotesByShift: (shiftId: string) => SessionNote[];
  getSessionNotesByClient: (clientId: string) => SessionNote[];
  getTimesheetsByCarer: (carerId: string) => Timesheet[];
  getComplianceRecordsByCarer: (carerId: string) => ComplianceRecord[];
  getClaimsByInvoice: (invoiceId: string) => ClaimSubmission[];
  getIncidentsByClient: (clientId: string) => IncidentReport[];
}

export const useStore = create<AppState>()((set, get) => ({
  clients: [],
  carers: [],
  shifts: [],
  invoices: [],
  carePlans: [],
  ndisRates: [],
  documents: [],
  sessionNotes: [],
  incidentReports: [],
  timesheets: [],
  complianceRecords: [],
  claimSubmissions: [],
  isInitialized: false,
  isLoading: false,

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const data = await db.fetchAllData();
      set({ ...data, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  // ── Clients ──
  addClient: async (client) => {
    const newClient = await db.insertClient(client);
    set((s) => ({ clients: [...s.clients, newClient] }));
    return newClient;
  },
  updateClient: async (id, data) => {
    const updated = await db.updateClient(id, data);
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? updated : c)) }));
  },
  deleteClient: async (id) => {
    await db.deleteClient(id);
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  },

  // ── Carers ──
  addCarer: async (carer) => {
    const n = await db.insertCarer(carer);
    set((s) => ({ carers: [...s.carers, n] }));
  },
  updateCarer: async (id, data) => {
    const u = await db.updateCarer(id, data);
    set((s) => ({ carers: s.carers.map((c) => (c.id === id ? u : c)) }));
  },
  deleteCarer: async (id) => {
    await db.deleteCarer(id);
    set((s) => ({ carers: s.carers.filter((c) => c.id !== id) }));
  },

  // ── Shifts ──
  addShift: async (shift) => {
    const n = await db.insertShift(shift);
    set((s) => ({ shifts: [...s.shifts, n] }));
  },
  updateShift: async (id, data) => {
    const u = await db.updateShift(id, data);
    set((s) => ({ shifts: s.shifts.map((sh) => (sh.id === id ? u : sh)) }));
  },
  deleteShift: async (id) => {
    await db.deleteShift(id);
    set((s) => ({ shifts: s.shifts.filter((sh) => sh.id !== id) }));
  },

  // ── Invoices ──
  addInvoice: async (invoice) => {
    const invoiceNumber = invoice.invoiceNumber || getNextInvoiceNumber(get().invoices);
    const n = await db.insertInvoice({ ...invoice, invoiceNumber });
    set((s) => ({ invoices: [...s.invoices, n] }));
    return n;
  },
  updateInvoice: async (id, data) => {
    const u = await db.updateInvoice(id, data);
    set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? u : i)) }));
  },
  deleteInvoice: async (id) => {
    await db.deleteInvoice(id);
    set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }));
  },

  // ── Care Plans ──
  updateCarePlan: async (id, data) => {
    const u = await db.updateCarePlan(id, data);
    set((s) => ({ carePlans: s.carePlans.map((cp) => (cp.id === id ? u : cp)) }));
  },
  addCarePlan: async (plan) => {
    const n = await db.insertCarePlan(plan);
    set((s) => ({ carePlans: [...s.carePlans, n] }));
  },

  // ── NDIS Rates ──
  updateNdisRate: async (id, data) => {
    const u = await db.updateNdisRate(id, data);
    set((s) => ({ ndisRates: s.ndisRates.map((r) => (r.id === id ? u : r)) }));
  },

  // ── Documents ──
  addDocument: async (doc) => {
    const n = await db.insertDocument(doc);
    set((s) => ({ documents: [...s.documents, n] }));
  },
  deleteDocument: async (id) => {
    await db.deleteDocument(id);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  // ── Session Notes ──
  addSessionNote: async (note) => {
    const n = await db.insertSessionNote(note);
    set((s) => ({ sessionNotes: [...s.sessionNotes, n] }));
    return n;
  },
  updateSessionNote: async (id, data) => {
    const u = await db.updateSessionNote(id, data);
    set((s) => ({ sessionNotes: s.sessionNotes.map((n) => (n.id === id ? u : n)) }));
  },
  deleteSessionNote: async (id) => {
    await db.deleteSessionNote(id);
    set((s) => ({ sessionNotes: s.sessionNotes.filter((n) => n.id !== id) }));
  },

  // ── Incident Reports ──
  addIncidentReport: async (report) => {
    const n = await db.insertIncidentReport(report);
    set((s) => ({ incidentReports: [...s.incidentReports, n] }));
    return n;
  },
  updateIncidentReport: async (id, data) => {
    const u = await db.updateIncidentReport(id, data);
    set((s) => ({ incidentReports: s.incidentReports.map((r) => (r.id === id ? u : r)) }));
  },
  deleteIncidentReport: async (id) => {
    await db.deleteIncidentReport(id);
    set((s) => ({ incidentReports: s.incidentReports.filter((r) => r.id !== id) }));
  },

  // ── Timesheets ──
  addTimesheet: async (ts) => {
    const n = await db.insertTimesheet(ts);
    set((s) => ({ timesheets: [...s.timesheets, n] }));
    return n;
  },
  updateTimesheet: async (id, data) => {
    const u = await db.updateTimesheet(id, data);
    set((s) => ({ timesheets: s.timesheets.map((t) => (t.id === id ? u : t)) }));
  },
  deleteTimesheet: async (id) => {
    await db.deleteTimesheet(id);
    set((s) => ({ timesheets: s.timesheets.filter((t) => t.id !== id) }));
  },

  // ── Compliance Records ──
  addComplianceRecord: async (record) => {
    const n = await db.insertComplianceRecord(record);
    set((s) => ({ complianceRecords: [...s.complianceRecords, n] }));
    return n;
  },
  updateComplianceRecord: async (id, data) => {
    const u = await db.updateComplianceRecord(id, data);
    set((s) => ({ complianceRecords: s.complianceRecords.map((r) => (r.id === id ? u : r)) }));
  },
  deleteComplianceRecord: async (id) => {
    await db.deleteComplianceRecord(id);
    set((s) => ({ complianceRecords: s.complianceRecords.filter((r) => r.id !== id) }));
  },

  // ── Claim Submissions ──
  addClaimSubmission: async (claim) => {
    const n = await db.insertClaimSubmission(claim);
    set((s) => ({ claimSubmissions: [...s.claimSubmissions, n] }));
    return n;
  },
  updateClaimSubmission: async (id, data) => {
    const u = await db.updateClaimSubmission(id, data);
    set((s) => ({ claimSubmissions: s.claimSubmissions.map((c) => (c.id === id ? u : c)) }));
  },
  deleteClaimSubmission: async (id) => {
    await db.deleteClaimSubmission(id);
    set((s) => ({ claimSubmissions: s.claimSubmissions.filter((c) => c.id !== id) }));
  },

  // ── Helpers ──
  getClientById: (id) => get().clients.find((c) => c.id === id),
  getCarerById: (id) => get().carers.find((c) => c.id === id),
  getShiftsByClient: (clientId) => get().shifts.filter((s) => s.clientId === clientId),
  getShiftsByCarer: (carerId) => get().shifts.filter((s) => s.carerId === carerId),
  getInvoicesByClient: (clientId) => get().invoices.filter((i) => i.clientId === clientId),
  getCarePlanByClient: (clientId) => get().carePlans.find((cp) => cp.clientId === clientId),
  getDocumentsByClient: (clientId) => get().documents.filter((d) => d.clientId === clientId),
  getSessionNotesByShift: (shiftId) => get().sessionNotes.filter((n) => n.shiftId === shiftId),
  getSessionNotesByClient: (clientId) => get().sessionNotes.filter((n) => n.clientId === clientId),
  getTimesheetsByCarer: (carerId) => get().timesheets.filter((t) => t.carerId === carerId),
  getComplianceRecordsByCarer: (carerId) => get().complianceRecords.filter((r) => r.carerId === carerId),
  getClaimsByInvoice: (invoiceId) => get().claimSubmissions.filter((c) => c.invoiceId === invoiceId),
  getIncidentsByClient: (clientId) => get().incidentReports.filter((r) => r.clientId === clientId),
}));

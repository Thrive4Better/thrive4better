import { create } from 'zustand';
import type { Client, Carer, Shift, Invoice, CarePlan, NdisRate, ClientDocument } from '@/types';
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

  // State
  isInitialized: boolean;
  isLoading: boolean;

  // Initialize from Supabase
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

  // NDIS rates actions
  updateNdisRate: (id: string, data: Partial<NdisRate>) => Promise<void>;

  // Document actions
  addDocument: (doc: Omit<ClientDocument, 'id'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  // Helpers
  getClientById: (id: string) => Client | undefined;
  getCarerById: (id: string) => Carer | undefined;
  getShiftsByClient: (clientId: string) => Shift[];
  getShiftsByCarer: (carerId: string) => Shift[];
  getInvoicesByClient: (clientId: string) => Invoice[];
  getCarePlanByClient: (clientId: string) => CarePlan | undefined;
  getDocumentsByClient: (clientId: string) => ClientDocument[];
}

export const useStore = create<AppState>()((set, get) => ({
  clients: [],
  carers: [],
  shifts: [],
  invoices: [],
  carePlans: [],
  ndisRates: [],
  documents: [],
  isInitialized: false,
  isLoading: false,

  // ── Initialize ──
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
    set((state) => ({ clients: [...state.clients, newClient] }));
    return newClient;
  },
  updateClient: async (id, data) => {
    const updated = await db.updateClient(id, data);
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? updated : c)),
    }));
  },
  deleteClient: async (id) => {
    await db.deleteClient(id);
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
  },

  // ── Carers ──
  addCarer: async (carer) => {
    const newCarer = await db.insertCarer(carer);
    set((state) => ({ carers: [...state.carers, newCarer] }));
  },
  updateCarer: async (id, data) => {
    const updated = await db.updateCarer(id, data);
    set((state) => ({
      carers: state.carers.map((c) => (c.id === id ? updated : c)),
    }));
  },
  deleteCarer: async (id) => {
    await db.deleteCarer(id);
    set((state) => ({ carers: state.carers.filter((c) => c.id !== id) }));
  },

  // ── Shifts ──
  addShift: async (shift) => {
    const newShift = await db.insertShift(shift);
    set((state) => ({ shifts: [...state.shifts, newShift] }));
  },
  updateShift: async (id, data) => {
    const updated = await db.updateShift(id, data);
    set((state) => ({
      shifts: state.shifts.map((s) => (s.id === id ? updated : s)),
    }));
  },
  deleteShift: async (id) => {
    await db.deleteShift(id);
    set((state) => ({ shifts: state.shifts.filter((s) => s.id !== id) }));
  },

  // ── Invoices ──
  addInvoice: async (invoice) => {
    const invoiceNumber = invoice.invoiceNumber || getNextInvoiceNumber(get().invoices);
    const newInvoice = await db.insertInvoice({ ...invoice, invoiceNumber });
    set((state) => ({ invoices: [...state.invoices, newInvoice] }));
    return newInvoice;
  },
  updateInvoice: async (id, data) => {
    const updated = await db.updateInvoice(id, data);
    set((state) => ({
      invoices: state.invoices.map((i) => (i.id === id ? updated : i)),
    }));
  },
  deleteInvoice: async (id) => {
    await db.deleteInvoice(id);
    set((state) => ({ invoices: state.invoices.filter((i) => i.id !== id) }));
  },

  // ── Care Plans ──
  updateCarePlan: async (id, data) => {
    const updated = await db.updateCarePlan(id, data);
    set((state) => ({
      carePlans: state.carePlans.map((cp) => (cp.id === id ? updated : cp)),
    }));
  },
  addCarePlan: async (plan) => {
    const newPlan = await db.insertCarePlan(plan);
    set((state) => ({ carePlans: [...state.carePlans, newPlan] }));
  },

  // ── NDIS Rates ──
  updateNdisRate: async (id, data) => {
    const updated = await db.updateNdisRate(id, data);
    set((state) => ({
      ndisRates: state.ndisRates.map((r) => (r.id === id ? updated : r)),
    }));
  },

  // ── Documents ──
  addDocument: async (doc) => {
    const newDoc = await db.insertDocument(doc);
    set((state) => ({ documents: [...state.documents, newDoc] }));
  },
  deleteDocument: async (id) => {
    await db.deleteDocument(id);
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));
  },

  // ── Helpers ──
  getClientById: (id) => get().clients.find((c) => c.id === id),
  getCarerById: (id) => get().carers.find((c) => c.id === id),
  getShiftsByClient: (clientId) => get().shifts.filter((s) => s.clientId === clientId),
  getShiftsByCarer: (carerId) => get().shifts.filter((s) => s.carerId === carerId),
  getInvoicesByClient: (clientId) => get().invoices.filter((i) => i.clientId === clientId),
  getCarePlanByClient: (clientId) => get().carePlans.find((cp) => cp.clientId === clientId),
  getDocumentsByClient: (clientId) => get().documents.filter((d) => d.clientId === clientId),
}));

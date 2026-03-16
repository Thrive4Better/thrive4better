import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Client, Carer, Shift, Invoice, CarePlan, NdisRate, ClientDocument } from '@/types';
import { mockClients, mockCarers, mockShifts, mockInvoices, mockCarePlans, mockNdisRates, mockDocuments } from '@/data/mockData';
import { generateId, getNextInvoiceNumber } from '@/lib/utils';

interface AppState {
  clients: Client[];
  carers: Carer[];
  shifts: Shift[];
  invoices: Invoice[];
  carePlans: CarePlan[];
  ndisRates: NdisRate[];
  documents: ClientDocument[];

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'supportCategories'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Carer actions
  addCarer: (carer: Omit<Carer, 'id' | 'createdAt'>) => void;
  updateCarer: (id: string, data: Partial<Carer>) => void;
  deleteCarer: (id: string) => void;

  // Shift actions
  addShift: (shift: Omit<Shift, 'id' | 'createdAt'>) => void;
  updateShift: (id: string, data: Partial<Shift>) => void;
  deleteShift: (id: string) => void;

  // Invoice actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Care plan actions
  updateCarePlan: (id: string, data: Partial<CarePlan>) => void;
  addCarePlan: (plan: Omit<CarePlan, 'id' | 'createdAt' | 'updatedAt'>) => void;

  // NDIS rates actions
  updateNdisRate: (id: string, data: Partial<NdisRate>) => void;

  // Document actions
  addDocument: (doc: Omit<ClientDocument, 'id'>) => void;
  deleteDocument: (id: string) => void;

  // Helpers
  getClientById: (id: string) => Client | undefined;
  getCarerById: (id: string) => Carer | undefined;
  getShiftsByClient: (clientId: string) => Shift[];
  getShiftsByCarer: (carerId: string) => Shift[];
  getInvoicesByClient: (clientId: string) => Invoice[];
  getCarePlanByClient: (clientId: string) => CarePlan | undefined;
  getDocumentsByClient: (clientId: string) => ClientDocument[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clients: mockClients,
      carers: mockCarers,
      shifts: mockShifts,
      invoices: mockInvoices,
      carePlans: mockCarePlans,
      ndisRates: mockNdisRates,
      documents: mockDocuments,

      // ── Clients ──
      addClient: (client) => set((state) => ({
        clients: [...state.clients, { ...client, id: generateId(), supportCategories: [], createdAt: new Date().toISOString().split('T')[0] }],
      })),
      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
      })),
      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
      })),

      // ── Carers ──
      addCarer: (carer) => set((state) => ({
        carers: [...state.carers, { ...carer, id: generateId(), createdAt: new Date().toISOString().split('T')[0] }],
      })),
      updateCarer: (id, data) => set((state) => ({
        carers: state.carers.map((c) => (c.id === id ? { ...c, ...data } : c)),
      })),
      deleteCarer: (id) => set((state) => ({
        carers: state.carers.filter((c) => c.id !== id),
      })),

      // ── Shifts ──
      addShift: (shift) => set((state) => ({
        shifts: [...state.shifts, { ...shift, id: generateId(), createdAt: new Date().toISOString().split('T')[0] }],
      })),
      updateShift: (id, data) => set((state) => ({
        shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...data } : s)),
      })),
      deleteShift: (id) => set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== id),
      })),

      // ── Invoices ──
      addInvoice: (invoice) => {
        const invoiceNumber = getNextInvoiceNumber(get().invoices);
        const newInvoice: Invoice = {
          ...invoice,
          id: generateId(),
          invoiceNumber,
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ invoices: [...state.invoices, newInvoice] }));
        return newInvoice;
      },
      updateInvoice: (id, data) => set((state) => ({
        invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...data } : i)),
      })),
      deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((i) => i.id !== id),
      })),

      // ── Care Plans ──
      updateCarePlan: (id, data) => set((state) => ({
        carePlans: state.carePlans.map((cp) => (cp.id === id ? { ...cp, ...data, updatedAt: new Date().toISOString().split('T')[0] } : cp)),
      })),
      addCarePlan: (plan) => set((state) => ({
        carePlans: [...state.carePlans, { ...plan, id: generateId(), createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] }],
      })),

      // ── NDIS Rates ──
      updateNdisRate: (id, data) => set((state) => ({
        ndisRates: state.ndisRates.map((r) => (r.id === id ? { ...r, ...data } : r)),
      })),

      // ── Documents ──
      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, { ...doc, id: generateId() }],
      })),
      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      })),

      // ── Helpers ──
      getClientById: (id) => get().clients.find((c) => c.id === id),
      getCarerById: (id) => get().carers.find((c) => c.id === id),
      getShiftsByClient: (clientId) => get().shifts.filter((s) => s.clientId === clientId),
      getShiftsByCarer: (carerId) => get().shifts.filter((s) => s.carerId === carerId),
      getInvoicesByClient: (clientId) => get().invoices.filter((i) => i.clientId === clientId),
      getCarePlanByClient: (clientId) => get().carePlans.find((cp) => cp.clientId === clientId),
      getDocumentsByClient: (clientId) => get().documents.filter((d) => d.clientId === clientId),
    }),
    {
      name: 'thrive4better-storage',
    }
  )
);

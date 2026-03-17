import { supabase, withTimeout } from '@/lib/supabase';
import {
  toClient,
  fromClient,
  toClientSupportCategory,
  fromClientSupportCategory,
  toCarer,
  fromCarer,
  toShift,
  fromShift,
  toCarePlan,
  fromCarePlan,
  toCarePlanGoal,
  fromCarePlanGoal,
  fromAlliedHealthContact,
  toInvoice,
  fromInvoice,
  fromInvoiceLineItem,
  toNdisRate,
  fromNdisRate,
  toClientDocument,
  fromClientDocument,
  toSessionNote,
  fromSessionNote,
  toIncidentReport,
  fromIncidentReport,
  toTimesheet,
  fromTimesheet,
  toComplianceRecord,
  fromComplianceRecord,
  toClaimSubmission,
  fromClaimSubmission,
  toUserInvitation,
  toUserProfile,
} from '@/lib/mappers';
import type {
  Client,
  Carer,
  Shift,
  CarePlan,
  Invoice,
  NdisRate,
  ClientDocument,
  SessionNote,
  IncidentReport,
  Timesheet,
  ComplianceRecord,
  ClaimSubmission,
  UserInvitation,
  UserProfile,
} from '@/types';

// ---------------------------------------------------------------------------
// NDIS Rates
// ---------------------------------------------------------------------------

export async function fetchNdisRates(): Promise<NdisRate[]> {
  const { data, error } = await supabase.from('ndis_rates').select('*');
  if (error) throw new Error(`Failed to fetch NDIS rates: ${error.message}`);
  return (data ?? []).map(toNdisRate);
}

export async function updateNdisRate(
  id: string,
  data: Partial<NdisRate>,
): Promise<NdisRate> {
  const row = fromNdisRate({ id, ...data } as NdisRate);
  delete row.id;

  const { data: updated, error } = await supabase
    .from('ndis_rates')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update NDIS rate: ${error.message}`);
  return toNdisRate(updated);
}

// ---------------------------------------------------------------------------
// Carers
// ---------------------------------------------------------------------------

export async function fetchCarers(): Promise<Carer[]> {
  const { data, error } = await supabase.from('carers').select('*');
  if (error) throw new Error(`Failed to fetch carers: ${error.message}`);
  return (data ?? []).map(toCarer);
}

export async function insertCarer(
  carer: Omit<Carer, 'id' | 'createdAt'>,
): Promise<Carer> {
  const row = fromCarer(carer);

  const { data, error } = await supabase
    .from('carers')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert carer: ${error.message}`);
  return toCarer(data);
}

export async function updateCarer(
  id: string,
  data: Partial<Carer>,
): Promise<Carer> {
  const row = fromCarer({ id, ...data } as Carer);
  delete row.id;
  delete row.created_at;

  const { data: updated, error } = await supabase
    .from('carers')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update carer: ${error.message}`);
  return toCarer(updated);
}

export async function deleteCarer(id: string): Promise<void> {
  const { error } = await supabase.from('carers').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete carer: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, client_support_categories(*)');
  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return (data ?? []).map(toClient);
}

export async function insertClient(
  client: Omit<Client, 'id' | 'createdAt'>,
): Promise<Client> {
  const { supportCategories, ...rest } = client;
  const row = fromClient(rest as Omit<Client, 'id' | 'createdAt'>);

  const { data: inserted, error } = await supabase
    .from('clients')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert client: ${error.message}`);

  const clientId = inserted.id;

  if (supportCategories && supportCategories.length > 0) {
    const categoryRows = supportCategories.map((sc) => ({
      ...fromClientSupportCategory(sc),
      client_id: clientId,
    }));
    const { error: scError } = await supabase
      .from('client_support_categories')
      .insert(categoryRows);
    if (scError)
      throw new Error(
        `Failed to insert support categories: ${scError.message}`,
      );
  }

  // Re-fetch with support categories joined
  const { data: full, error: fetchError } = await supabase
    .from('clients')
    .select('*, client_support_categories(*)')
    .eq('id', clientId)
    .single();
  if (fetchError)
    throw new Error(`Failed to fetch inserted client: ${fetchError.message}`);
  return toClient(full);
}

export async function updateClient(
  id: string,
  data: Partial<Client>,
): Promise<Client> {
  const { supportCategories, ...rest } = data;
  const row = fromClient({ id, ...rest } as Client);
  delete row.id;
  delete row.created_at;

  const { error } = await supabase
    .from('clients')
    .update(row)
    .eq('id', id);
  if (error) throw new Error(`Failed to update client: ${error.message}`);

  // Replace support categories if provided
  if (supportCategories !== undefined) {
    const { error: delError } = await supabase
      .from('client_support_categories')
      .delete()
      .eq('client_id', id);
    if (delError)
      throw new Error(
        `Failed to delete old support categories: ${delError.message}`,
      );

    if (supportCategories.length > 0) {
      const categoryRows = supportCategories.map((sc) => ({
        ...fromClientSupportCategory(sc),
        client_id: id,
      }));
      const { error: insError } = await supabase
        .from('client_support_categories')
        .insert(categoryRows);
      if (insError)
        throw new Error(
          `Failed to insert support categories: ${insError.message}`,
        );
    }
  }

  // Re-fetch with support categories joined
  const { data: full, error: fetchError } = await supabase
    .from('clients')
    .select('*, client_support_categories(*)')
    .eq('id', id)
    .single();
  if (fetchError)
    throw new Error(`Failed to fetch updated client: ${fetchError.message}`);
  return toClient(full);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete client: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from('shifts').select('*');
  if (error) throw new Error(`Failed to fetch shifts: ${error.message}`);
  return (data ?? []).map(toShift);
}

export async function insertShift(
  shift: Omit<Shift, 'id' | 'createdAt'>,
): Promise<Shift> {
  const row = fromShift(shift);

  const { data, error } = await supabase
    .from('shifts')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert shift: ${error.message}`);
  return toShift(data);
}

export async function updateShift(
  id: string,
  data: Partial<Shift>,
): Promise<Shift> {
  const row = fromShift({ id, ...data } as Shift);
  delete row.id;
  delete row.created_at;

  const { data: updated, error } = await supabase
    .from('shifts')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update shift: ${error.message}`);
  return toShift(updated);
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete shift: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Care Plans
// ---------------------------------------------------------------------------

export async function fetchCarePlans(): Promise<CarePlan[]> {
  const { data, error } = await supabase
    .from('care_plans')
    .select('*, care_plan_goals(*), allied_health_contacts(*)');
  if (error) throw new Error(`Failed to fetch care plans: ${error.message}`);
  return (data ?? []).map(toCarePlan);
}

export async function insertCarePlan(
  plan: Omit<CarePlan, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CarePlan> {
  const { goals, alliedHealthContacts, ...rest } = plan;
  const row = fromCarePlan(
    rest as Omit<CarePlan, 'id' | 'createdAt' | 'updatedAt'>,
  );

  const { data: inserted, error } = await supabase
    .from('care_plans')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert care plan: ${error.message}`);

  const planId = inserted.id;

  if (goals && goals.length > 0) {
    const goalRows = goals.map((g) => ({
      ...fromCarePlanGoal(g),
      care_plan_id: planId,
    }));
    const { error: gError } = await supabase
      .from('care_plan_goals')
      .insert(goalRows);
    if (gError)
      throw new Error(`Failed to insert care plan goals: ${gError.message}`);
  }

  if (alliedHealthContacts && alliedHealthContacts.length > 0) {
    const contactRows = alliedHealthContacts.map((c) => ({
      ...fromAlliedHealthContact(c),
      care_plan_id: planId,
    }));
    const { error: cError } = await supabase
      .from('allied_health_contacts')
      .insert(contactRows);
    if (cError)
      throw new Error(
        `Failed to insert allied health contacts: ${cError.message}`,
      );
  }

  // Re-fetch with nested data
  const { data: full, error: fetchError } = await supabase
    .from('care_plans')
    .select('*, care_plan_goals(*), allied_health_contacts(*)')
    .eq('id', planId)
    .single();
  if (fetchError)
    throw new Error(
      `Failed to fetch inserted care plan: ${fetchError.message}`,
    );
  return toCarePlan(full);
}

export async function updateCarePlan(
  id: string,
  data: Partial<CarePlan>,
): Promise<CarePlan> {
  const { goals, alliedHealthContacts, ...rest } = data;
  const row = fromCarePlan({ id, ...rest } as CarePlan);
  delete row.id;
  delete row.created_at;
  delete row.updated_at;

  const { error } = await supabase
    .from('care_plans')
    .update(row)
    .eq('id', id);
  if (error) throw new Error(`Failed to update care plan: ${error.message}`);

  // Replace goals if provided
  if (goals !== undefined) {
    const { error: delError } = await supabase
      .from('care_plan_goals')
      .delete()
      .eq('care_plan_id', id);
    if (delError)
      throw new Error(
        `Failed to delete old care plan goals: ${delError.message}`,
      );

    if (goals.length > 0) {
      const goalRows = goals.map((g) => ({
        ...fromCarePlanGoal(g),
        care_plan_id: id,
      }));
      const { error: insError } = await supabase
        .from('care_plan_goals')
        .insert(goalRows);
      if (insError)
        throw new Error(
          `Failed to insert care plan goals: ${insError.message}`,
        );
    }
  }

  // Replace allied health contacts if provided
  if (alliedHealthContacts !== undefined) {
    const { error: delError } = await supabase
      .from('allied_health_contacts')
      .delete()
      .eq('care_plan_id', id);
    if (delError)
      throw new Error(
        `Failed to delete old allied health contacts: ${delError.message}`,
      );

    if (alliedHealthContacts.length > 0) {
      const contactRows = alliedHealthContacts.map((c) => ({
        ...fromAlliedHealthContact(c),
        care_plan_id: id,
      }));
      const { error: insError } = await supabase
        .from('allied_health_contacts')
        .insert(contactRows);
      if (insError)
        throw new Error(
          `Failed to insert allied health contacts: ${insError.message}`,
        );
    }
  }

  // Re-fetch with nested data
  const { data: full, error: fetchError } = await supabase
    .from('care_plans')
    .select('*, care_plan_goals(*), allied_health_contacts(*)')
    .eq('id', id)
    .single();
  if (fetchError)
    throw new Error(
      `Failed to fetch updated care plan: ${fetchError.message}`,
    );
  return toCarePlan(full);
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*)');
  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return (data ?? []).map(toInvoice);
}

export async function insertInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
): Promise<Invoice> {
  const { lineItems, ...rest } = invoice;
  const row = fromInvoice(rest as Omit<Invoice, 'id' | 'createdAt'>);

  const { data: inserted, error } = await supabase
    .from('invoices')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert invoice: ${error.message}`);

  const invoiceId = inserted.id;

  if (lineItems && lineItems.length > 0) {
    const itemRows = lineItems.map((li) => ({
      ...fromInvoiceLineItem(li),
      invoice_id: invoiceId,
    }));
    const { error: liError } = await supabase
      .from('invoice_line_items')
      .insert(itemRows);
    if (liError)
      throw new Error(
        `Failed to insert invoice line items: ${liError.message}`,
      );
  }

  // Re-fetch with line items
  const { data: full, error: fetchError } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*)')
    .eq('id', invoiceId)
    .single();
  if (fetchError)
    throw new Error(
      `Failed to fetch inserted invoice: ${fetchError.message}`,
    );
  return toInvoice(full);
}

export async function updateInvoice(
  id: string,
  data: Partial<Invoice>,
): Promise<Invoice> {
  const { lineItems, ...rest } = data;
  const row = fromInvoice({ id, ...rest } as Invoice);
  delete row.id;
  delete row.created_at;

  const { error } = await supabase
    .from('invoices')
    .update(row)
    .eq('id', id);
  if (error) throw new Error(`Failed to update invoice: ${error.message}`);

  // Replace line items if provided
  if (lineItems !== undefined) {
    const { error: delError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', id);
    if (delError)
      throw new Error(
        `Failed to delete old invoice line items: ${delError.message}`,
      );

    if (lineItems.length > 0) {
      const itemRows = lineItems.map((li) => ({
        ...fromInvoiceLineItem(li),
        invoice_id: id,
      }));
      const { error: insError } = await supabase
        .from('invoice_line_items')
        .insert(itemRows);
      if (insError)
        throw new Error(
          `Failed to insert invoice line items: ${insError.message}`,
        );
    }
  }

  // Re-fetch with line items
  const { data: full, error: fetchError } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*)')
    .eq('id', id)
    .single();
  if (fetchError)
    throw new Error(
      `Failed to fetch updated invoice: ${fetchError.message}`,
    );
  return toInvoice(full);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Client Documents
// ---------------------------------------------------------------------------

export async function fetchDocuments(): Promise<ClientDocument[]> {
  const { data, error } = await supabase
    .from('client_documents')
    .select('*');
  if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
  return (data ?? []).map(toClientDocument);
}

export async function insertDocument(
  doc: Omit<ClientDocument, 'id'>,
): Promise<ClientDocument> {
  const row = fromClientDocument(doc);

  const { data, error } = await supabase
    .from('client_documents')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`Failed to insert document: ${error.message}`);
  return toClientDocument(data);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Session Notes
// ---------------------------------------------------------------------------

export async function fetchSessionNotes(): Promise<SessionNote[]> {
  const { data, error } = await supabase.from('session_notes').select('*');
  if (error) throw new Error(`Failed to fetch session notes: ${error.message}`);
  return (data ?? []).map(toSessionNote);
}

export async function insertSessionNote(
  note: Omit<SessionNote, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SessionNote> {
  const row = fromSessionNote(note);
  const { data, error } = await supabase.from('session_notes').insert(row).select().single();
  if (error) throw new Error(`Failed to insert session note: ${error.message}`);
  return toSessionNote(data);
}

export async function updateSessionNote(id: string, data: Partial<SessionNote>): Promise<SessionNote> {
  const row = fromSessionNote({ id, ...data } as SessionNote);
  delete row.id;
  const { data: updated, error } = await supabase.from('session_notes').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update session note: ${error.message}`);
  return toSessionNote(updated);
}

export async function deleteSessionNote(id: string): Promise<void> {
  const { error } = await supabase.from('session_notes').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete session note: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Incident Reports
// ---------------------------------------------------------------------------

export async function fetchIncidentReports(): Promise<IncidentReport[]> {
  const { data, error } = await supabase.from('incident_reports').select('*');
  if (error) throw new Error(`Failed to fetch incident reports: ${error.message}`);
  return (data ?? []).map(toIncidentReport);
}

export async function insertIncidentReport(
  report: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<IncidentReport> {
  const row = fromIncidentReport(report);
  const { data, error } = await supabase.from('incident_reports').insert(row).select().single();
  if (error) throw new Error(`Failed to insert incident report: ${error.message}`);
  return toIncidentReport(data);
}

export async function updateIncidentReport(id: string, data: Partial<IncidentReport>): Promise<IncidentReport> {
  const row = fromIncidentReport({ id, ...data } as IncidentReport);
  delete row.id;
  const { data: updated, error } = await supabase.from('incident_reports').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update incident report: ${error.message}`);
  return toIncidentReport(updated);
}

export async function deleteIncidentReport(id: string): Promise<void> {
  const { error } = await supabase.from('incident_reports').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete incident report: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Timesheets
// ---------------------------------------------------------------------------

export async function fetchTimesheets(): Promise<Timesheet[]> {
  const { data, error } = await supabase.from('timesheets').select('*');
  if (error) throw new Error(`Failed to fetch timesheets: ${error.message}`);
  return (data ?? []).map(toTimesheet);
}

export async function insertTimesheet(
  ts: Omit<Timesheet, 'id' | 'createdAt'>,
): Promise<Timesheet> {
  const row = fromTimesheet(ts);
  const { data, error } = await supabase.from('timesheets').insert(row).select().single();
  if (error) throw new Error(`Failed to insert timesheet: ${error.message}`);
  return toTimesheet(data);
}

export async function updateTimesheet(id: string, data: Partial<Timesheet>): Promise<Timesheet> {
  const row = fromTimesheet({ id, ...data } as Timesheet);
  delete row.id;
  const { data: updated, error } = await supabase.from('timesheets').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update timesheet: ${error.message}`);
  return toTimesheet(updated);
}

export async function deleteTimesheet(id: string): Promise<void> {
  const { error } = await supabase.from('timesheets').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete timesheet: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Compliance Records
// ---------------------------------------------------------------------------

export async function fetchComplianceRecords(): Promise<ComplianceRecord[]> {
  const { data, error } = await supabase.from('compliance_records').select('*');
  if (error) throw new Error(`Failed to fetch compliance records: ${error.message}`);
  return (data ?? []).map(toComplianceRecord);
}

export async function insertComplianceRecord(
  record: Omit<ComplianceRecord, 'id' | 'createdAt'>,
): Promise<ComplianceRecord> {
  const row = fromComplianceRecord(record);
  const { data, error } = await supabase.from('compliance_records').insert(row).select().single();
  if (error) throw new Error(`Failed to insert compliance record: ${error.message}`);
  return toComplianceRecord(data);
}

export async function updateComplianceRecord(id: string, data: Partial<ComplianceRecord>): Promise<ComplianceRecord> {
  const row = fromComplianceRecord({ id, ...data } as ComplianceRecord);
  delete row.id;
  const { data: updated, error } = await supabase.from('compliance_records').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update compliance record: ${error.message}`);
  return toComplianceRecord(updated);
}

export async function deleteComplianceRecord(id: string): Promise<void> {
  const { error } = await supabase.from('compliance_records').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete compliance record: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Claim Submissions
// ---------------------------------------------------------------------------

export async function fetchClaimSubmissions(): Promise<ClaimSubmission[]> {
  const { data, error } = await supabase.from('claim_submissions').select('*');
  if (error) throw new Error(`Failed to fetch claim submissions: ${error.message}`);
  return (data ?? []).map(toClaimSubmission);
}

export async function insertClaimSubmission(
  claim: Omit<ClaimSubmission, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ClaimSubmission> {
  const row = fromClaimSubmission(claim);
  const { data, error } = await supabase.from('claim_submissions').insert(row).select().single();
  if (error) throw new Error(`Failed to insert claim submission: ${error.message}`);
  return toClaimSubmission(data);
}

export async function updateClaimSubmission(id: string, data: Partial<ClaimSubmission>): Promise<ClaimSubmission> {
  const row = fromClaimSubmission({ id, ...data } as ClaimSubmission);
  delete row.id;
  const { data: updated, error } = await supabase.from('claim_submissions').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update claim submission: ${error.message}`);
  return toClaimSubmission(updated);
}

export async function deleteClaimSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('claim_submissions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete claim submission: ${error.message}`);
}

// ---------------------------------------------------------------------------
// User Profiles & Invitations
// ---------------------------------------------------------------------------

export async function fetchUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(`Failed to fetch user profiles: ${error.message}`);
  return (data ?? []).map(toUserProfile);
}

export async function updateUserProfile(id: string, updates: { role?: string; carer_id?: string | null }): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
}

export async function fetchUserInvitations(): Promise<UserInvitation[]> {
  const { data, error } = await supabase.from('user_invitations').select('*');
  if (error) throw new Error(`Failed to fetch user invitations: ${error.message}`);
  return (data ?? []).map(toUserInvitation);
}

// ---------------------------------------------------------------------------
// Fetch All
// ---------------------------------------------------------------------------

export async function fetchAllData(): Promise<{
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
}> {
  console.log('[Store] Fetching all data...');

  // Fetch each independently so one failure doesn't block everything
  // Each query has a 10s timeout to prevent infinite hangs
  const safelyFetch = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    try {
      const result = await withTimeout(fn(), 10000, name);
      console.log(`[Store] ✓ ${name}: ${result.length} records`);
      return result;
    } catch (err) {
      console.error(`[Store] ✗ ${name} failed:`, err instanceof Error ? err.message : err);
      return [];
    }
  };

  const [
    clients, carers, shifts, invoices, carePlans, ndisRates, documents,
    sessionNotes, incidentReports, timesheets, complianceRecords, claimSubmissions,
  ] = await Promise.all([
    safelyFetch('clients', fetchClients),
    safelyFetch('carers', fetchCarers),
    safelyFetch('shifts', fetchShifts),
    safelyFetch('invoices', fetchInvoices),
    safelyFetch('carePlans', fetchCarePlans),
    safelyFetch('ndisRates', fetchNdisRates),
    safelyFetch('documents', fetchDocuments),
    safelyFetch('sessionNotes', fetchSessionNotes),
    safelyFetch('incidentReports', fetchIncidentReports),
    safelyFetch('timesheets', fetchTimesheets),
    safelyFetch('complianceRecords', fetchComplianceRecords),
    safelyFetch('claimSubmissions', fetchClaimSubmissions),
  ]);

  console.log('[Store] All data loaded');
  return {
    clients, carers, shifts, invoices, carePlans, ndisRates, documents,
    sessionNotes, incidentReports, timesheets, complianceRecords, claimSubmissions,
  };
}

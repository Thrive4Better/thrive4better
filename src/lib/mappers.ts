import type {
  Client,
  ClientSupportCategory,
  CarePlan,
  CarePlanGoal,
  AlliedHealthContact,
  Carer,
  Shift,
  Invoice,
  InvoiceLineItem,
  NdisRate,
  ClientDocument,
} from '@/types';

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Strip undefined values so Supabase doesn't receive explicit undefined keys. */
function omitUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// ClientSupportCategory
// ---------------------------------------------------------------------------

export function toClientSupportCategory(row: any): ClientSupportCategory {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    allocatedBudget: row.allocated_budget,
    spentAmount: row.spent_amount,
  };
}

export function fromClientSupportCategory(
  entity: ClientSupportCategory,
): Record<string, unknown> {
  return omitUndefined({
    category_id: entity.categoryId,
    category_name: entity.categoryName,
    allocated_budget: entity.allocatedBudget,
    spent_amount: entity.spentAmount,
  });
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function toClient(row: any): Client {
  const supportCategories: ClientSupportCategory[] = Array.isArray(
    row.client_support_categories,
  )
    ? row.client_support_categories.map(toClientSupportCategory)
    : [];

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    ndisNumber: row.ndis_number,
    address: row.address,
    suburb: row.suburb,
    postcode: row.postcode,
    phone: row.phone,
    email: row.email,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    preferredCommunication: row.preferred_communication,
    fundingType: row.funding_type,
    planStartDate: row.plan_start_date,
    planEndDate: row.plan_end_date,
    planManagerName: row.plan_manager_name,
    planManagerEmail: row.plan_manager_email,
    planManagerPhone: row.plan_manager_phone,
    supportCoordinatorName: row.support_coordinator_name,
    supportCoordinatorContact: row.support_coordinator_contact,
    status: row.status,
    notes: row.notes,
    supportCategories,
    createdAt: row.created_at,
  };
}

export function fromClient(
  entity: Client | Omit<Client, 'id' | 'createdAt'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as Client).id,
    first_name: entity.firstName,
    last_name: entity.lastName,
    date_of_birth: entity.dateOfBirth,
    ndis_number: entity.ndisNumber,
    address: entity.address,
    suburb: entity.suburb,
    postcode: entity.postcode,
    phone: entity.phone,
    email: entity.email,
    emergency_contact_name: entity.emergencyContactName,
    emergency_contact_phone: entity.emergencyContactPhone,
    preferred_communication: entity.preferredCommunication,
    funding_type: entity.fundingType,
    plan_start_date: entity.planStartDate,
    plan_end_date: entity.planEndDate,
    plan_manager_name: entity.planManagerName,
    plan_manager_email: entity.planManagerEmail,
    plan_manager_phone: entity.planManagerPhone,
    support_coordinator_name: entity.supportCoordinatorName,
    support_coordinator_contact: entity.supportCoordinatorContact,
    status: entity.status,
    notes: entity.notes,
    created_at: (entity as Client).createdAt,
  });
}

// ---------------------------------------------------------------------------
// CarePlanGoal
// ---------------------------------------------------------------------------

export function toCarePlanGoal(row: any): CarePlanGoal {
  return {
    id: row.id,
    description: row.description,
    targetDate: row.target_date,
    status: row.status,
  };
}

export function fromCarePlanGoal(
  entity: CarePlanGoal,
): Record<string, unknown> {
  return omitUndefined({
    id: entity.id,
    description: entity.description,
    target_date: entity.targetDate,
    status: entity.status,
  });
}

// ---------------------------------------------------------------------------
// AlliedHealthContact
// ---------------------------------------------------------------------------

export function toAlliedHealthContact(row: any): AlliedHealthContact {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
  };
}

export function fromAlliedHealthContact(
  entity: AlliedHealthContact,
): Record<string, unknown> {
  return omitUndefined({
    id: entity.id,
    name: entity.name,
    role: entity.role,
    phone: entity.phone,
    email: entity.email,
  });
}

// ---------------------------------------------------------------------------
// CarePlan
// ---------------------------------------------------------------------------

export function toCarePlan(row: any): CarePlan {
  const goals: CarePlanGoal[] = Array.isArray(row.care_plan_goals)
    ? row.care_plan_goals.map(toCarePlanGoal)
    : [];

  const alliedHealthContacts: AlliedHealthContact[] = Array.isArray(
    row.allied_health_contacts,
  )
    ? row.allied_health_contacts.map(toAlliedHealthContact)
    : [];

  return {
    id: row.id,
    clientId: row.client_id,
    goals,
    supportNeedsSummary: row.support_needs_summary,
    preferredRoutines: row.preferred_routines,
    likesAndPreferences: row.likes_and_preferences,
    communicationNeeds: row.communication_needs,
    riskNotes: row.risk_notes,
    medicalInfo: row.medical_info,
    alliedHealthContacts,
    lastReviewedDate: row.last_reviewed_date,
    nextReviewDueDate: row.next_review_due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromCarePlan(
  entity: CarePlan | Omit<CarePlan, 'id' | 'createdAt' | 'updatedAt'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as CarePlan).id,
    client_id: entity.clientId,
    support_needs_summary: entity.supportNeedsSummary,
    preferred_routines: entity.preferredRoutines,
    likes_and_preferences: entity.likesAndPreferences,
    communication_needs: entity.communicationNeeds,
    risk_notes: entity.riskNotes,
    medical_info: entity.medicalInfo,
    last_reviewed_date: entity.lastReviewedDate,
    next_review_due_date: entity.nextReviewDueDate,
    created_at: (entity as CarePlan).createdAt,
    updated_at: (entity as CarePlan).updatedAt,
  });
}

// ---------------------------------------------------------------------------
// Carer
// ---------------------------------------------------------------------------

export function toCarer(row: any): Carer {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    qualifications: row.qualifications ?? [],
    availability: row.availability ?? [],
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function fromCarer(
  entity: Carer | Omit<Carer, 'id' | 'createdAt'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as Carer).id,
    first_name: entity.firstName,
    last_name: entity.lastName,
    phone: entity.phone,
    email: entity.email,
    role: entity.role,
    qualifications: entity.qualifications,
    availability: entity.availability,
    status: entity.status,
    notes: entity.notes,
    created_at: (entity as Carer).createdAt,
  });
}

// ---------------------------------------------------------------------------
// Shift
// ---------------------------------------------------------------------------

export function toShift(row: any): Shift {
  return {
    id: row.id,
    clientId: row.client_id,
    carerId: row.carer_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    serviceType: row.service_type,
    supportCategory: row.support_category,
    ndisLineItemCode: row.ndis_line_item_code,
    hourlyRate: row.hourly_rate,
    totalAmount: row.total_amount,
    hours: row.hours,
    notes: row.notes,
    status: row.status,
    convertToInvoice: row.convert_to_invoice,
    createdAt: row.created_at,
  };
}

export function fromShift(
  entity: Shift | Omit<Shift, 'id' | 'createdAt'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as Shift).id,
    client_id: entity.clientId,
    carer_id: entity.carerId,
    date: entity.date,
    start_time: entity.startTime,
    end_time: entity.endTime,
    service_type: entity.serviceType,
    support_category: entity.supportCategory,
    ndis_line_item_code: entity.ndisLineItemCode,
    hourly_rate: entity.hourlyRate,
    total_amount: entity.totalAmount,
    hours: entity.hours,
    notes: entity.notes,
    status: entity.status,
    convert_to_invoice: entity.convertToInvoice,
    created_at: (entity as Shift).createdAt,
  });
}

// ---------------------------------------------------------------------------
// InvoiceLineItem
// ---------------------------------------------------------------------------

export function toInvoiceLineItem(row: any): InvoiceLineItem {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    ndisLineItemCode: row.ndis_line_item_code,
    supportCategory: row.support_category,
    hours: row.hours,
    rate: row.rate,
    amount: row.amount,
    shiftId: row.shift_id ?? undefined,
  };
}

export function fromInvoiceLineItem(
  entity: InvoiceLineItem,
): Record<string, unknown> {
  return omitUndefined({
    id: entity.id,
    date: entity.date,
    description: entity.description,
    ndis_line_item_code: entity.ndisLineItemCode,
    support_category: entity.supportCategory,
    hours: entity.hours,
    rate: entity.rate,
    amount: entity.amount,
    shift_id: entity.shiftId,
  });
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export function toInvoice(row: any): Invoice {
  const lineItems: InvoiceLineItem[] = Array.isArray(row.invoice_line_items)
    ? row.invoice_line_items.map(toInvoiceLineItem)
    : [];

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    referenceNumber: row.reference_number,
    notesToClient: row.notes_to_client,
    lineItems,
    subtotal: row.subtotal,
    gstApplicable: row.gst_applicable,
    gstAmount: row.gst_amount,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function fromInvoice(
  entity: Invoice | Omit<Invoice, 'id' | 'createdAt'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as Invoice).id,
    invoice_number: entity.invoiceNumber,
    client_id: entity.clientId,
    invoice_date: entity.invoiceDate,
    due_date: entity.dueDate,
    period_start: entity.periodStart,
    period_end: entity.periodEnd,
    reference_number: entity.referenceNumber,
    notes_to_client: entity.notesToClient,
    subtotal: entity.subtotal,
    gst_applicable: entity.gstApplicable,
    gst_amount: entity.gstAmount,
    total: entity.total,
    status: entity.status,
    created_at: (entity as Invoice).createdAt,
  });
}

// ---------------------------------------------------------------------------
// NdisRate
// ---------------------------------------------------------------------------

export function toNdisRate(row: any): NdisRate {
  return {
    id: row.id,
    supportItemName: row.support_item_name,
    lineItemCode: row.line_item_code,
    supportCategory: row.support_category,
    unit: row.unit,
    standardRate: row.standard_rate,
    eveningRate: row.evening_rate,
    nightRate: row.night_rate,
    saturdayRate: row.saturday_rate,
    sundayRate: row.sunday_rate,
    publicHolidayRate: row.public_holiday_rate,
  };
}

export function fromNdisRate(
  entity: NdisRate,
): Record<string, unknown> {
  return omitUndefined({
    id: entity.id,
    support_item_name: entity.supportItemName,
    line_item_code: entity.lineItemCode,
    support_category: entity.supportCategory,
    unit: entity.unit,
    standard_rate: entity.standardRate,
    evening_rate: entity.eveningRate,
    night_rate: entity.nightRate,
    saturday_rate: entity.saturdayRate,
    sunday_rate: entity.sundayRate,
    public_holiday_rate: entity.publicHolidayRate,
  });
}

// ---------------------------------------------------------------------------
// ClientDocument
// ---------------------------------------------------------------------------

export function toClientDocument(row: any): ClientDocument {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    fileType: row.file_type,
    uploadDate: row.upload_date,
    size: row.size,
    storagePath: row.storage_path,
  };
}

export function fromClientDocument(
  entity: ClientDocument | Omit<ClientDocument, 'id'>,
): Record<string, unknown> {
  return omitUndefined({
    id: (entity as ClientDocument).id,
    client_id: entity.clientId,
    name: entity.name,
    file_type: entity.fileType,
    upload_date: entity.uploadDate,
    size: entity.size,
    storage_path: entity.storagePath,
  });
}

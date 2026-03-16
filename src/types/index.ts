export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ndisNumber: string;
  address: string;
  suburb: string;
  postcode: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredCommunication: 'phone' | 'email' | 'text';
  fundingType: 'Agency Managed' | 'Plan Managed' | 'Self Managed';
  planStartDate: string;
  planEndDate: string;
  planManagerName: string;
  planManagerEmail: string;
  planManagerPhone: string;
  supportCoordinatorName: string;
  supportCoordinatorContact: string;
  status: 'Active' | 'Inactive' | 'On Hold';
  notes: string;
  supportCategories: ClientSupportCategory[];
  createdAt: string;
}

export interface ClientSupportCategory {
  categoryId: string;
  categoryName: string;
  allocatedBudget: number;
  spentAmount: number;
}

export interface CarePlan {
  id: string;
  clientId: string;
  goals: CarePlanGoal[];
  supportNeedsSummary: string;
  preferredRoutines: string;
  likesAndPreferences: string;
  communicationNeeds: string;
  riskNotes: string;
  medicalInfo: string;
  alliedHealthContacts: AlliedHealthContact[];
  lastReviewedDate: string;
  nextReviewDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanGoal {
  id: string;
  description: string;
  targetDate: string;
  status: 'Not Started' | 'In Progress' | 'Achieved';
}

export interface AlliedHealthContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Carer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  qualifications: string[];
  availability: string[];
  status: 'Active' | 'Unavailable' | 'On Leave';
  notes: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  clientId: string;
  carerId: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: 'Daily Living' | 'Community Access' | 'SIL' | 'Transport' | 'Social/Rec' | 'Other';
  supportCategory: string;
  ndisLineItemCode: string;
  hourlyRate: number;
  totalAmount: number;
  hours: number;
  notes: string;
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  convertToInvoice: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  referenceNumber: string;
  notesToClient: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gstApplicable: boolean;
  gstAmount: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  date: string;
  description: string;
  ndisLineItemCode: string;
  supportCategory: string;
  hours: number;
  rate: number;
  amount: number;
  shiftId?: string;
}

export interface NdisRate {
  id: string;
  supportItemName: string;
  lineItemCode: string;
  supportCategory: string;
  unit: 'Hour' | 'Each';
  standardRate: number;
  eveningRate: number;
  nightRate: number;
  saturdayRate: number;
  sundayRate: number;
  publicHolidayRate: number;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  fileType: string;
  uploadDate: string;
  size: string;
}

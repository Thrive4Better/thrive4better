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
  status: 'Active' | 'Inactive' | 'On Hold' | 'Archived';
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
  status: 'Active' | 'Unavailable' | 'On Leave' | 'Archived';
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
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void' | 'Archived';
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
  storagePath?: string;
}

// ── RBAC ──

export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  carerId?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

// ── Session Notes ──

export type ParticipantMood = 'great' | 'good' | 'neutral' | 'low' | 'distressed';

export interface SessionNote {
  id: string;
  shiftId: string;
  carerId: string;
  clientId: string;
  content: string;
  participantMood: ParticipantMood;
  goalsAddressed: string[];
  followUpRequired: boolean;
  followUpNotes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Incident Reports ──

export type IncidentType = 'injury' | 'behavior' | 'medication' | 'property' | 'fall' | 'abuse_neglect' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'under_review' | 'resolved' | 'closed';

export interface IncidentReport {
  id: string;
  clientId: string;
  carerId: string;
  shiftId?: string;
  incidentDate: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  description: string;
  immediateActionTaken: string;
  followUpRequired: boolean;
  followUpNotes: string;
  witnessNames: string;
  reportedBy: string;
  reviewedBy?: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Timesheets ──

export type TimesheetStatus = 'pending' | 'approved' | 'rejected';

export interface Timesheet {
  id: string;
  carerId: string;
  shiftId: string;
  clockIn?: string;
  clockOut?: string;
  breakMinutes: number;
  totalHours?: number;
  status: TimesheetStatus;
  approvedBy?: string;
  notes: string;
  createdAt: string;
}

// ── Compliance Records ──

export type ComplianceCheckType =
  | 'NDIS Worker Screening' | 'First Aid' | 'WWCC' | 'Police Check'
  | 'Manual Handling' | 'Medication Admin' | 'CPR' | 'Infection Control'
  | 'Food Safety' | 'Driver License' | 'Working at Heights' | 'Other';

export type ComplianceStatus = 'valid' | 'expiring_soon' | 'expired' | 'pending';

export interface ComplianceRecord {
  id: string;
  carerId: string;
  checkType: ComplianceCheckType;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  status: ComplianceStatus;
  documentPath?: string;
  notes: string;
  createdAt: string;
}

// ── Claim Submissions ──

export type ClaimPortal = 'PRODA' | 'Plan Manager Portal' | 'Self Managed' | 'Other';
export type ClaimStatus = 'submitted' | 'accepted' | 'rejected' | 'paid' | 'partial';

export interface ClaimSubmission {
  id: string;
  invoiceId: string;
  claimReference: string;
  submittedDate: string;
  portal: ClaimPortal;
  status: ClaimStatus;
  paidAmount?: number;
  paidDate?: string;
  rejectionReason?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── User Invitations ──

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  carerId?: string;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

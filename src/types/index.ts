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
  nominatedContactName?: string;
  nominatedContactPhone?: string;
  nominatedContactRelation?: string;
  interests?: string[];
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
  isSubcontractor: boolean;
  notes: string;
  createdAt: string;
  // Extended profile fields
  dateOfBirth?: string;
  age?: number; // computed
  address?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  tfn?: string; // Tax File Number (masked)
  abn?: string; // if subcontractor
  bankAccountName?: string;
  bankBsb?: string;
  bankAccountNumber?: string;
  superFundName?: string;
  superMemberNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  hireDate?: string;
  hourlyRate?: number;
  tier?: 'Junior' | 'Standard' | 'Senior' | 'Lead';
  preferredClients?: string[]; // client IDs
  maxWeeklyHours?: number;
  driversLicense?: boolean;
  ownVehicle?: boolean;
  languages?: string[];
  specializations?: string[];
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

export type ShiftNoteType = 'general' | 'incident' | 'progress' | 'medication' | 'behaviour';

export interface ShiftNote {
  id: string;
  shiftId: string;
  carerId: string;
  clientId: string;
  content: string;
  timestamp: string;
  noteType: ShiftNoteType;
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
  accountingCategoryId?: string;
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

export type UserRole = 'admin' | 'manager' | 'staff' | 'client' | 'guest';

// ── Activity Reviews ──

export type ReviewMood = 'great' | 'good' | 'okay' | 'not_great' | 'bad';

export interface ActivityReview {
  id: string;
  shiftId: string;
  clientId: string;
  carerId: string;
  activityRating: number; // 1-5
  carerRating: number; // 1-5
  activityFeedback: string;
  carerFeedback: string;
  mood: ReviewMood;
  createdAt: string;
}

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

// ── Modular Care Plan ──

export type CarePlanSectionType =
  | 'participant_details'
  | 'plan_overview'
  | 'support_needs'
  | 'goals_and_outcomes'
  | 'risk_assessment'
  | 'communication_plan'
  | 'daily_routine'
  | 'medication_management'
  | 'behaviour_support'
  | 'cultural_considerations'
  | 'emergency_contacts'
  | 'review_schedule'
  | 'short_term_goals'
  | 'long_term_goals'
  | 'core_supports'
  | 'capacity_building_supports'
  | 'capital_supports'
  | 'carer_contacts'
  | 'sign_off'
  | 'custom';

export interface CarePlanSection {
  id: string;
  type: CarePlanSectionType;
  title: string;
  content: string;
  order: number;
  lastUpdated: string;
  generatedByAi: boolean;
  customTitle?: string;
}

export interface ModularCarePlan extends CarePlan {
  sections: CarePlanSection[];
  templateVersion: string;
  lastExported?: string;
}

// ── Payroll ──

export type PayRunStatus = 'Draft' | 'Processing' | 'Completed';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface PayRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  frequency: PayFrequency;
  status: PayRunStatus;
  totalGross: number;
  totalSuper: number;
  totalPAYG: number;
  totalNet: number;
  lineItems: PayRunLineItem[];
  processedAt?: string;
  createdAt: string;
}

export interface PayRunLineItem {
  carerId: string;
  carerName: string;
  isSubcontractor: boolean;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  superAmount: number;
  paygWithholding: number;
  allowances: number;
  deductions: number;
  netPay: number;
}

// ── Subcontractor Shift Log ──

export interface ShiftLog {
  id: string;
  carerId: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime: string;
  activityType: string;
  notes: string;
  goalsAddressed: string;
  travelKm: number;
  createdAt: string;
}

// ── Contractor Invoices ──

export interface ContractorInvoice {
  id: string;
  carerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  contractorAbn: string;
  contractorAddress: string;
  contractorBankName: string;
  contractorAccountName: string;
  contractorBsb: string;
  contractorAccountNumber: string;
  registeredForGst: boolean;
  lineItems: ContractorInvoiceLineItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface ContractorInvoiceLineItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  shiftLogId?: string;
}

export interface RemittanceAdvice {
  id: string;
  remittanceNumber: string;
  contractorInvoiceIds: string[];
  carerId: string;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  gstAmount: number;
  withholdingTax: number;
  totalPaid: number;
  notes?: string;
  createdAt: string;
}

// ── Reminder Settings ──

export type ReminderChannel = 'none' | 'sms' | 'email' | 'both';

export interface ReminderSettings {
  shiftRemindersEnabled: boolean;
  shiftReminderHoursBefore: number;
  shiftReminderChannel: ReminderChannel;
  appointmentRemindersEnabled: boolean;
  appointmentReminderHoursBefore: number;
  appointmentReminderChannel: ReminderChannel;
  overdueInvoiceRemindersEnabled: boolean;
  overdueInvoiceReminderDaysAfter: number;
  overdueInvoiceReminderChannel: ReminderChannel;
}

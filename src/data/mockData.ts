import type { Client, Carer, Shift, Invoice, CarePlan, NdisRate, ClientDocument } from '@/types';
import { addDays, subDays, format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

const today = new Date();
const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
const lastMonday = subWeeks(thisMonday, 1);
const nextMonday = addWeeks(thisMonday, 1);

function d(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ─── NDIS RATES ────────────────────────────────────
export const mockNdisRates: NdisRate[] = [
  { id: 'rate-1', supportItemName: 'Assistance with Daily Life - Standard', lineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', unit: 'Hour', standardRate: 67.56, eveningRate: 74.28, nightRate: 76.87, saturdayRate: 94.58, sundayRate: 121.61, publicHolidayRate: 148.63 },
  { id: 'rate-2', supportItemName: 'Assistance with Daily Life - Level 2', lineItemCode: '01_011_0107_1_1', supportCategory: '01 - Daily Activities', unit: 'Hour', standardRate: 70.20, eveningRate: 77.18, nightRate: 79.88, saturdayRate: 98.28, sundayRate: 126.36, publicHolidayRate: 154.44 },
  { id: 'rate-3', supportItemName: 'Community Access - Standard', lineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', unit: 'Hour', standardRate: 67.56, eveningRate: 74.28, nightRate: 76.87, saturdayRate: 94.58, sundayRate: 121.61, publicHolidayRate: 148.63 },
  { id: 'rate-4', supportItemName: 'Community Access - Level 2', lineItemCode: '04_105_0125_6_1', supportCategory: '04 - Assistance with Social', unit: 'Hour', standardRate: 70.20, eveningRate: 77.18, nightRate: 79.88, saturdayRate: 98.28, sundayRate: 126.36, publicHolidayRate: 154.44 },
  { id: 'rate-5', supportItemName: 'SIL - Standard Weekday', lineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', unit: 'Hour', standardRate: 58.70, eveningRate: 64.54, nightRate: 66.80, saturdayRate: 82.18, sundayRate: 105.66, publicHolidayRate: 129.14 },
  { id: 'rate-6', supportItemName: 'Assist with Social & Community Participation', lineItemCode: '04_102_0125_6_1', supportCategory: '04 - Assistance with Social', unit: 'Hour', standardRate: 67.56, eveningRate: 74.28, nightRate: 76.87, saturdayRate: 94.58, sundayRate: 121.61, publicHolidayRate: 148.63 },
  { id: 'rate-7', supportItemName: 'Transport - Community Access', lineItemCode: '04_590_0125_6_1', supportCategory: '04 - Assistance with Social', unit: 'Hour', standardRate: 67.56, eveningRate: 74.28, nightRate: 76.87, saturdayRate: 94.58, sundayRate: 121.61, publicHolidayRate: 148.63 },
  { id: 'rate-8', supportItemName: 'Improved Daily Living Skills', lineItemCode: '15_037_0117_1_3', supportCategory: '02 - Health & Wellbeing', unit: 'Hour', standardRate: 193.99, eveningRate: 193.99, nightRate: 193.99, saturdayRate: 193.99, sundayRate: 193.99, publicHolidayRate: 193.99 },
  { id: 'rate-9', supportItemName: 'Group Activities - 1:2 ratio', lineItemCode: '04_400_0104_1_1', supportCategory: '04 - Assistance with Social', unit: 'Hour', standardRate: 33.78, eveningRate: 37.14, nightRate: 38.44, saturdayRate: 47.29, sundayRate: 60.81, publicHolidayRate: 74.32 },
  { id: 'rate-10', supportItemName: 'Assistance with Self-Care', lineItemCode: '01_001_0107_1_1', supportCategory: '01 - Daily Activities', unit: 'Hour', standardRate: 67.56, eveningRate: 74.28, nightRate: 76.87, saturdayRate: 94.58, sundayRate: 121.61, publicHolidayRate: 148.63 },
];

// ─── CLIENTS ───────────────────────────────────────
export const mockClients: Client[] = [
  {
    id: 'client-1', firstName: 'Sarah', lastName: 'Mitchell', dateOfBirth: '1992-04-15', ndisNumber: '431 287 650', address: '42 Smith Street', suburb: 'Fitzroy', postcode: '3065', phone: '0412 345 678', email: 'sarah.mitchell@email.com', emergencyContactName: 'David Mitchell', emergencyContactPhone: '0413 987 654', preferredCommunication: 'phone', fundingType: 'Plan Managed', planStartDate: '2025-07-01', planEndDate: '2026-06-30', planManagerName: 'Plan Partners Australia', planManagerEmail: 'claims@planpartners.com.au', planManagerPhone: '1300 887 461', supportCoordinatorName: 'Jennifer Walsh', supportCoordinatorContact: '0421 555 789', status: 'Active', notes: 'Prefers morning appointments. Has a therapy dog named Biscuit.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 24500, spentAmount: 18200 },
      { categoryId: 'cat-2', categoryName: '04 - Assistance with Social', allocatedBudget: 12000, spentAmount: 6800 },
    ], createdAt: '2024-06-15',
  },
  {
    id: 'client-2', firstName: 'James', lastName: 'Nguyen', dateOfBirth: '1985-11-22', ndisNumber: '431 456 789', address: '15 High Street', suburb: 'Northcote', postcode: '3070', phone: '0423 456 789', email: 'james.nguyen@email.com', emergencyContactName: 'Linh Nguyen', emergencyContactPhone: '0424 111 222', preferredCommunication: 'email', fundingType: 'Agency Managed', planStartDate: '2025-09-01', planEndDate: '2026-08-31', planManagerName: 'NDIA', planManagerEmail: '', planManagerPhone: '1800 800 110', supportCoordinatorName: 'Mark Thompson', supportCoordinatorContact: '0432 666 777', status: 'Active', notes: 'Requires Vietnamese interpreter for complex discussions.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 32000, spentAmount: 14500 },
      { categoryId: 'cat-3', categoryName: '03 - SIL', allocatedBudget: 85000, spentAmount: 52000 },
    ], createdAt: '2024-08-10',
  },
  {
    id: 'client-3', firstName: 'Emma', lastName: 'Williams', dateOfBirth: '1998-02-08', ndisNumber: '431 789 012', address: '88 Plenty Road', suburb: 'Preston', postcode: '3072', phone: '0434 567 890', email: 'emma.w@email.com', emergencyContactName: 'Karen Williams', emergencyContactPhone: '0435 222 333', preferredCommunication: 'text', fundingType: 'Self Managed', planStartDate: '2025-04-01', planEndDate: '2026-03-31', planManagerName: '', planManagerEmail: '', planManagerPhone: '', supportCoordinatorName: 'Rachel Green', supportCoordinatorContact: '0443 888 999', status: 'Active', notes: 'Very independent. Loves art and music therapy.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 18000, spentAmount: 12300 },
      { categoryId: 'cat-2', categoryName: '04 - Assistance with Social', allocatedBudget: 15000, spentAmount: 9200 },
    ], createdAt: '2024-03-20',
  },
  {
    id: 'client-4', firstName: 'Michael', lastName: 'O\'Brien', dateOfBirth: '1978-08-30', ndisNumber: '431 012 345', address: '201 Broadway', suburb: 'Reservoir', postcode: '3073', phone: '0445 678 901', email: 'michael.obrien@email.com', emergencyContactName: 'Fiona O\'Brien', emergencyContactPhone: '0446 333 444', preferredCommunication: 'phone', fundingType: 'Plan Managed', planStartDate: '2025-06-01', planEndDate: '2026-05-31', planManagerName: 'My Plan Manager', planManagerEmail: 'invoices@myplanmanager.com.au', planManagerPhone: '1800 951 272', supportCoordinatorName: 'David Chen', supportCoordinatorContact: '0454 777 888', status: 'Active', notes: 'Wheelchair user. Requires accessible transport.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 28000, spentAmount: 19600 },
      { categoryId: 'cat-2', categoryName: '04 - Assistance with Social', allocatedBudget: 9500, spentAmount: 4300 },
      { categoryId: 'cat-4', categoryName: '02 - Health & Wellbeing', allocatedBudget: 6000, spentAmount: 3800 },
    ], createdAt: '2024-05-01',
  },
  {
    id: 'client-5', firstName: 'Aisha', lastName: 'Hassan', dateOfBirth: '2001-06-12', ndisNumber: '431 234 567', address: '56 Sydney Road', suburb: 'Brunswick', postcode: '3056', phone: '0456 789 012', email: 'aisha.h@email.com', emergencyContactName: 'Fatima Hassan', emergencyContactPhone: '0457 444 555', preferredCommunication: 'text', fundingType: 'Plan Managed', planStartDate: '2025-10-01', planEndDate: '2026-09-30', planManagerName: 'First Choice Plan Managers', planManagerEmail: 'claims@firstchoicepm.com.au', planManagerPhone: '1300 365 028', supportCoordinatorName: 'Sarah Ahmed', supportCoordinatorContact: '0465 999 000', status: 'Active', notes: 'University student. Flexible scheduling needed.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 15000, spentAmount: 8900 },
      { categoryId: 'cat-2', categoryName: '04 - Assistance with Social', allocatedBudget: 20000, spentAmount: 11000 },
    ], createdAt: '2024-09-15',
  },
  {
    id: 'client-6', firstName: 'Robert', lastName: 'Taylor', dateOfBirth: '1965-12-03', ndisNumber: '431 567 890', address: '77 Bell Street', suburb: 'Coburg', postcode: '3058', phone: '0467 890 123', email: 'rob.taylor@email.com', emergencyContactName: 'Margaret Taylor', emergencyContactPhone: '0468 555 666', preferredCommunication: 'phone', fundingType: 'Agency Managed', planStartDate: '2025-03-01', planEndDate: '2026-02-28', planManagerName: 'NDIA', planManagerEmail: '', planManagerPhone: '1800 800 110', supportCoordinatorName: 'Lisa Park', supportCoordinatorContact: '0476 111 222', status: 'On Hold', notes: 'Plan under review. Awaiting reassessment.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 22000, spentAmount: 22000 },
    ], createdAt: '2024-02-28',
  },
  {
    id: 'client-7', firstName: 'Priya', lastName: 'Sharma', dateOfBirth: '1990-09-18', ndisNumber: '431 890 123', address: '33 Hutton Street', suburb: 'Thornbury', postcode: '3071', phone: '0478 901 234', email: 'priya.sharma@email.com', emergencyContactName: 'Raj Sharma', emergencyContactPhone: '0479 666 777', preferredCommunication: 'email', fundingType: 'Plan Managed', planStartDate: '2025-08-01', planEndDate: '2026-07-31', planManagerName: 'Plan Partners Australia', planManagerEmail: 'claims@planpartners.com.au', planManagerPhone: '1300 887 461', supportCoordinatorName: 'Jennifer Walsh', supportCoordinatorContact: '0421 555 789', status: 'Active', notes: 'Attends day program Tues/Thurs. Loves cooking.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 20000, spentAmount: 10500 },
      { categoryId: 'cat-2', categoryName: '04 - Assistance with Social', allocatedBudget: 16000, spentAmount: 7200 },
      { categoryId: 'cat-4', categoryName: '02 - Health & Wellbeing', allocatedBudget: 4000, spentAmount: 1600 },
    ], createdAt: '2024-07-20',
  },
  {
    id: 'client-8', firstName: 'Thomas', lastName: 'Anderson', dateOfBirth: '1973-03-25', ndisNumber: '431 345 678', address: '12 Doncaster Road', suburb: 'Doncaster', postcode: '3108', phone: '0489 012 345', email: 'tom.anderson@email.com', emergencyContactName: 'Julie Anderson', emergencyContactPhone: '0490 777 888', preferredCommunication: 'phone', fundingType: 'Self Managed', planStartDate: '2025-01-01', planEndDate: '2025-12-31', planManagerName: '', planManagerEmail: '', planManagerPhone: '', supportCoordinatorName: 'Mark Thompson', supportCoordinatorContact: '0432 666 777', status: 'Inactive', notes: 'Moved to another provider temporarily.', supportCategories: [
      { categoryId: 'cat-1', categoryName: '01 - Daily Activities', allocatedBudget: 30000, spentAmount: 5400 },
    ], createdAt: '2024-01-10',
  },
];

// ─── CARERS ────────────────────────────────────────
export const mockCarers: Carer[] = [
  { id: 'carer-1', firstName: 'Lucy', lastName: 'Chen', phone: '0401 234 567', email: 'lucy.chen@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling', 'Medication Administration'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active', notes: 'Senior support worker. Specialises in complex care.', createdAt: '2023-11-01', isSubcontractor: false },
  { id: 'carer-2', firstName: 'Daniel', lastName: 'Osei', phone: '0402 345 678', email: 'daniel.osei@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'], status: 'Active', notes: 'Great with community access activities.', createdAt: '2024-01-15', isSubcontractor: false },
  { id: 'carer-3', firstName: 'Sophie', lastName: 'Martinez', phone: '0403 456 789', email: 'sophie.martinez@thrive4better.com.au', role: 'Team Leader', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling', 'Medication Administration'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], status: 'Active', notes: 'Team leader for SIL house in Reservoir.', createdAt: '2023-09-20', isSubcontractor: false },
  { id: 'carer-4', firstName: 'Rahul', lastName: 'Patel', phone: '0404 567 890', email: 'rahul.patel@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening'], availability: ['Thursday', 'Friday', 'Saturday', 'Sunday'], status: 'Active', notes: 'Part-time. Available mostly weekends.', createdAt: '2024-03-10', isSubcontractor: false },
  { id: 'carer-5', firstName: 'Megan', lastName: 'Foster', phone: '0405 678 901', email: 'megan.foster@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling'], availability: ['Monday', 'Wednesday', 'Friday'], status: 'On Leave', notes: 'On annual leave until 24 March.', createdAt: '2024-02-05', isSubcontractor: false },
];

// ─── SHIFTS ────────────────────────────────────────
function makeShift(id: string, clientId: string, carerId: string, date: Date, start: string, end: string, serviceType: Shift['serviceType'], status: Shift['status'], cat: string, code: string, rate: number, notes: string = ''): Shift {
  const hours = (() => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
  })();
  return { id, clientId, carerId, date: d(date), startTime: start, endTime: end, serviceType, supportCategory: cat, ndisLineItemCode: code, hourlyRate: rate, totalAmount: Math.round(hours * rate * 100) / 100, hours, notes, status, convertToInvoice: status === 'Completed', createdAt: d(subDays(date, 7)) };
}

export const mockShifts: Shift[] = [
  // ── LAST WEEK (completed) ──
  makeShift('shift-01', 'client-1', 'carer-1', lastMonday, '09:00', '13:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine support and meal prep'),
  makeShift('shift-02', 'client-2', 'carer-2', lastMonday, '14:00', '18:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Shopping and community outing'),
  makeShift('shift-03', 'client-3', 'carer-1', addDays(lastMonday, 1), '10:00', '14:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Personal care and light housework'),
  makeShift('shift-04', 'client-4', 'carer-3', addDays(lastMonday, 1), '08:00', '16:00', 'SIL', 'Completed', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShift('shift-05', 'client-5', 'carer-2', addDays(lastMonday, 2), '09:00', '12:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShift('shift-06', 'client-7', 'carer-1', addDays(lastMonday, 3), '10:00', '14:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Cooking skills and daily living'),
  makeShift('shift-07', 'client-1', 'carer-4', addDays(lastMonday, 4), '09:00', '13:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'End of week support'),
  makeShift('shift-08', 'client-2', 'carer-4', addDays(lastMonday, 5), '10:00', '15:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 94.58, 'Saturday community outing'),
  // ── THIS WEEK ──
  makeShift('shift-09', 'client-1', 'carer-1', thisMonday, '09:00', '13:00', 'Daily Living', 'Confirmed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine support'),
  makeShift('shift-10', 'client-3', 'carer-2', thisMonday, '14:00', '17:00', 'Community Access', 'Confirmed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Art class transport'),
  makeShift('shift-11', 'client-4', 'carer-3', addDays(thisMonday, 1), '08:00', '16:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShift('shift-12', 'client-5', 'carer-2', addDays(thisMonday, 1), '09:00', '12:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShift('shift-13', 'client-7', 'carer-1', addDays(thisMonday, 2), '10:00', '14:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Day program support'),
  makeShift('shift-14', 'client-2', 'carer-3', addDays(thisMonday, 2), '14:00', '18:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL afternoon shift'),
  makeShift('shift-15', 'client-1', 'carer-1', addDays(thisMonday, 3), '09:00', '12:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning support'),
  makeShift('shift-16', 'client-3', 'carer-4', addDays(thisMonday, 4), '10:00', '15:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Personal care and outing'),
  makeShift('shift-17', 'client-5', 'carer-2', addDays(thisMonday, 4), '13:00', '16:00', 'Social/Rec', 'Scheduled', '04 - Assistance with Social', '04_102_0125_6_1', 67.56, 'Social activity'),
  makeShift('shift-18', 'client-4', 'carer-4', addDays(thisMonday, 5), '09:00', '14:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 94.58, 'Saturday community access'),
  // ── NEXT WEEK ──
  makeShift('shift-19', 'client-1', 'carer-1', nextMonday, '09:00', '13:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine'),
  makeShift('shift-20', 'client-2', 'carer-2', nextMonday, '14:00', '18:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Community outing'),
  makeShift('shift-21', 'client-4', 'carer-3', addDays(nextMonday, 1), '08:00', '16:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShift('shift-22', 'client-7', 'carer-1', addDays(nextMonday, 2), '10:00', '14:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Day program'),
  makeShift('shift-23', 'client-5', 'carer-2', addDays(nextMonday, 3), '09:00', '12:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShift('shift-24', 'client-3', 'carer-4', addDays(nextMonday, 4), '10:00', '15:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Friday support session'),
];

// ─── INVOICES ──────────────────────────────────────
export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1', invoiceNumber: 'T4B-2026-001', clientId: 'client-1', invoiceDate: '2026-02-01', dueDate: '2026-02-15', periodStart: '2026-01-01', periodEnd: '2026-01-31', referenceNumber: '', notesToClient: '', subtotal: 1621.44, gstApplicable: false, gstAmount: 0, total: 1621.44, status: 'Paid', createdAt: '2026-02-01',
    lineItems: [
      { id: 'li-1a', date: '2026-01-06', description: 'Assistance with Daily Life - Morning routine', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-1b', date: '2026-01-10', description: 'Assistance with Daily Life - Personal care', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-1c', date: '2026-01-13', description: 'Assistance with Daily Life - Meal prep', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-1d', date: '2026-01-17', description: 'Community Access - Shopping trip', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-1e', date: '2026-01-20', description: 'Assistance with Daily Life - Weekly support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-1f', date: '2026-01-25', description: 'Community Access - Saturday outing', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 4.3, rate: 94.58, amount: 405.36 },
    ],
  },
  {
    id: 'inv-2', invoiceNumber: 'T4B-2026-002', clientId: 'client-2', invoiceDate: '2026-02-01', dueDate: '2026-02-15', periodStart: '2026-01-01', periodEnd: '2026-01-31', referenceNumber: 'PO-2026-JN', notesToClient: '', subtotal: 2810.40, gstApplicable: false, gstAmount: 0, total: 2810.40, status: 'Paid', createdAt: '2026-02-01',
    lineItems: [
      { id: 'li-2a', date: '2026-01-07', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-2b', date: '2026-01-14', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-2c', date: '2026-01-21', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-2d', date: '2026-01-28', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-2e', date: '2026-01-11', description: 'Community Access - Saturday outing', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 4, rate: 94.58, amount: 378.32 },
      { id: 'li-2f', date: '2026-01-18', description: 'Community Access - Weekend activity', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 5.83, rate: 94.58, amount: 553.68 },
    ],
  },
  {
    id: 'inv-3', invoiceNumber: 'T4B-2026-003', clientId: 'client-4', invoiceDate: '2026-02-05', dueDate: '2026-02-19', periodStart: '2026-01-01', periodEnd: '2026-01-31', referenceNumber: '', notesToClient: '', subtotal: 1486.32, gstApplicable: false, gstAmount: 0, total: 1486.32, status: 'Paid', createdAt: '2026-02-05',
    lineItems: [
      { id: 'li-3a', date: '2026-01-08', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-3b', date: '2026-01-15', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-3c', date: '2026-01-22', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-3d', date: '2026-01-12', description: 'Community Access - Saturday transport', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3.5, rate: 94.58, amount: 331.03 },
      { id: 'li-3e', date: '2026-01-29', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 3.5, rate: 67.56, amount: 344.57 },
    ],
  },
  {
    id: 'inv-4', invoiceNumber: 'T4B-2026-004', clientId: 'client-1', invoiceDate: '2026-03-01', dueDate: '2026-03-15', periodStart: '2026-02-01', periodEnd: '2026-02-28', referenceNumber: '', notesToClient: '', subtotal: 1351.20, gstApplicable: false, gstAmount: 0, total: 1351.20, status: 'Sent', createdAt: '2026-03-01',
    lineItems: [
      { id: 'li-4a', date: '2026-02-03', description: 'Assistance with Daily Life - Morning routine', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-4b', date: '2026-02-10', description: 'Assistance with Daily Life - Personal care', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-4c', date: '2026-02-17', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-4d', date: '2026-02-24', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-4e', date: '2026-02-21', description: 'Assistance with Daily Life - Meal prep', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
    ],
  },
  {
    id: 'inv-5', invoiceNumber: 'T4B-2026-005', clientId: 'client-3', invoiceDate: '2026-03-01', dueDate: '2026-03-15', periodStart: '2026-02-01', periodEnd: '2026-02-28', referenceNumber: '', notesToClient: '', subtotal: 1756.56, gstApplicable: false, gstAmount: 0, total: 1756.56, status: 'Sent', createdAt: '2026-03-01',
    lineItems: [
      { id: 'li-5a', date: '2026-02-04', description: 'Assistance with Daily Life - Personal care', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-5b', date: '2026-02-07', description: 'Community Access - Art class', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-5c', date: '2026-02-11', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-5d', date: '2026-02-14', description: 'Community Access - Music therapy', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-5e', date: '2026-02-18', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
      { id: 'li-5f', date: '2026-02-25', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 3.5, rate: 67.56, amount: 472.92 },
    ],
  },
  {
    id: 'inv-6', invoiceNumber: 'T4B-2026-006', clientId: 'client-5', invoiceDate: '2026-03-01', dueDate: '2026-03-15', periodStart: '2026-02-01', periodEnd: '2026-02-28', referenceNumber: '', notesToClient: '', subtotal: 1013.40, gstApplicable: false, gstAmount: 0, total: 1013.40, status: 'Sent', createdAt: '2026-03-01',
    lineItems: [
      { id: 'li-6a', date: '2026-02-05', description: 'Community Access - University support', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-6b', date: '2026-02-12', description: 'Community Access - University support', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-6c', date: '2026-02-19', description: 'Community Access - University support', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-6d', date: '2026-02-26', description: 'Community Access - University support', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-6e', date: '2026-02-22', description: 'Social/Rec - Weekend activity', ndisLineItemCode: '04_102_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
    ],
  },
  {
    id: 'inv-7', invoiceNumber: 'T4B-2026-007', clientId: 'client-7', invoiceDate: '2026-03-01', dueDate: '2026-03-15', periodStart: '2026-02-01', periodEnd: '2026-02-28', referenceNumber: '', notesToClient: '', subtotal: 1148.52, gstApplicable: false, gstAmount: 0, total: 1148.52, status: 'Sent', createdAt: '2026-03-01',
    lineItems: [
      { id: 'li-7a', date: '2026-02-06', description: 'Assistance with Daily Life - Day program', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-7b', date: '2026-02-13', description: 'Assistance with Daily Life - Cooking skills', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-7c', date: '2026-02-20', description: 'Assistance with Daily Life - Day program', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-7d', date: '2026-02-27', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
    ],
  },
  // Overdue
  {
    id: 'inv-8', invoiceNumber: 'T4B-2025-011', clientId: 'client-2', invoiceDate: '2025-12-01', dueDate: '2025-12-15', periodStart: '2025-11-01', periodEnd: '2025-11-30', referenceNumber: 'PO-2025-JN', notesToClient: 'Please pay at your earliest convenience.', subtotal: 2345.60, gstApplicable: false, gstAmount: 0, total: 2345.60, status: 'Overdue', createdAt: '2025-12-01',
    lineItems: [
      { id: 'li-8a', date: '2025-11-04', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-8b', date: '2025-11-11', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-8c', date: '2025-11-18', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-8d', date: '2025-11-25', description: 'SIL - Day shift', ndisLineItemCode: '03_001_0104_1_1', supportCategory: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { id: 'li-8e', date: '2025-11-15', description: 'Community Access - Weekend', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 5, rate: 93.44, amount: 467.20 },
    ],
  },
  {
    id: 'inv-9', invoiceNumber: 'T4B-2025-012', clientId: 'client-4', invoiceDate: '2026-01-05', dueDate: '2026-01-19', periodStart: '2025-12-01', periodEnd: '2025-12-31', referenceNumber: '', notesToClient: '', subtotal: 1891.68, gstApplicable: false, gstAmount: 0, total: 1891.68, status: 'Overdue', createdAt: '2026-01-05',
    lineItems: [
      { id: 'li-9a', date: '2025-12-02', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-9b', date: '2025-12-09', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-9c', date: '2025-12-16', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-9d', date: '2025-12-23', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-9e', date: '2025-12-07', description: 'Community Access - Saturday', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 4, rate: 94.58, amount: 378.32 },
      { id: 'li-9f', date: '2025-12-14', description: 'Community Access - Saturday', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3.5, rate: 94.58, amount: 432.40 },
    ],
  },
  // Drafts
  {
    id: 'inv-10', invoiceNumber: 'T4B-2026-008', clientId: 'client-3', invoiceDate: d(today), dueDate: d(addDays(today, 14)), periodStart: '2026-03-01', periodEnd: '2026-03-15', referenceNumber: '', notesToClient: '', subtotal: 810.72, gstApplicable: false, gstAmount: 0, total: 810.72, status: 'Draft', createdAt: d(today),
    lineItems: [
      { id: 'li-10a', date: '2026-03-03', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-10b', date: '2026-03-07', description: 'Community Access - Art class', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-10c', date: '2026-03-10', description: 'Assistance with Daily Life - Support', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
    ],
  },
  {
    id: 'inv-11', invoiceNumber: 'T4B-2026-009', clientId: 'client-5', invoiceDate: d(today), dueDate: d(addDays(today, 14)), periodStart: '2026-03-01', periodEnd: '2026-03-15', referenceNumber: '', notesToClient: '', subtotal: 608.04, gstApplicable: false, gstAmount: 0, total: 608.04, status: 'Draft', createdAt: d(today),
    lineItems: [
      { id: 'li-11a', date: '2026-03-04', description: 'Community Access - University', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-11b', date: '2026-03-06', description: 'Social/Rec - Activity', ndisLineItemCode: '04_102_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { id: 'li-11c', date: '2026-03-11', description: 'Community Access - University', ndisLineItemCode: '04_104_0125_6_1', supportCategory: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
    ],
  },
  {
    id: 'inv-12', invoiceNumber: 'T4B-2026-010', clientId: 'client-7', invoiceDate: d(today), dueDate: d(addDays(today, 14)), periodStart: '2026-03-01', periodEnd: '2026-03-15', referenceNumber: '', notesToClient: '', subtotal: 540.48, gstApplicable: false, gstAmount: 0, total: 540.48, status: 'Draft', createdAt: d(today),
    lineItems: [
      { id: 'li-12a', date: '2026-03-05', description: 'Assistance with Daily Life - Day program', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { id: 'li-12b', date: '2026-03-12', description: 'Assistance with Daily Life - Cooking', ndisLineItemCode: '01_002_0107_1_1', supportCategory: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
    ],
  },
];

// ─── CARE PLANS ────────────────────────────────────
export const mockCarePlans: CarePlan[] = [
  {
    id: 'cp-1', clientId: 'client-1',
    goals: [
      { id: 'g-1a', description: 'Develop independent meal preparation skills for 3 meals per week', targetDate: '2026-03-31', status: 'In Progress' },
      { id: 'g-1b', description: 'Attend community gym sessions twice per week', targetDate: '2026-06-30', status: 'In Progress' },
      { id: 'g-1c', description: 'Build confidence to use public transport independently', targetDate: '2026-06-30', status: 'Not Started' },
    ],
    supportNeedsSummary: 'Sarah requires support with daily living activities including personal care, meal preparation, and household tasks. She benefits from consistent routines and gentle encouragement to build independence.',
    preferredRoutines: 'Mornings: Wake at 7:30am, breakfast routine, medication. Support sessions preferred between 9am-1pm. Walks therapy dog Biscuit at 3pm daily.',
    likesAndPreferences: 'Loves cooking (especially baking), music therapy, and spending time with therapy dog Biscuit. Enjoys gardening and craft activities. Prefers female support workers for personal care.',
    communicationNeeds: 'Communicates well verbally. May need extra time to process complex information. Responds well to visual schedules and written lists.',
    riskNotes: 'Low falls risk. Can become anxious in crowded environments. Has an action plan for anxiety episodes - see medical folder.',
    medicalInfo: 'Conditions: Anxiety disorder, mild intellectual disability. Medications: Sertraline 50mg daily (morning). Allergies: Penicillin. GP: Dr. Kim Patel, Fitzroy Medical Centre.',
    alliedHealthContacts: [
      { id: 'ah-1a', name: 'Dr. Kim Patel', role: 'GP', phone: '03 9415 2200', email: 'reception@fitzroymedical.com.au' },
      { id: 'ah-1b', name: 'Tanya Brooks', role: 'Occupational Therapist', phone: '0412 998 877', email: 'tanya@alliedot.com.au' },
      { id: 'ah-1c', name: 'Dr. Mia Chen', role: 'Psychologist', phone: '03 9481 3300', email: 'mia.chen@mindmatters.com.au' },
    ],
    lastReviewedDate: '2025-12-15', nextReviewDueDate: '2026-06-15', createdAt: '2025-07-01', updatedAt: '2025-12-15',
  },
  {
    id: 'cp-2', clientId: 'client-4',
    goals: [
      { id: 'g-2a', description: 'Maintain current level of independent transfers with minimal assistance', targetDate: '2026-05-31', status: 'In Progress' },
      { id: 'g-2b', description: 'Participate in weekly community social group', targetDate: '2026-03-31', status: 'Achieved' },
      { id: 'g-2c', description: 'Develop skills to manage personal finances with support', targetDate: '2026-12-31', status: 'Not Started' },
    ],
    supportNeedsSummary: 'Michael uses a powered wheelchair and requires assistance with transfers, personal care, and community access. He is motivated to maintain his physical abilities and social connections.',
    preferredRoutines: 'Morning routine starts at 7am. Enjoys an early start. Attends physio on Tuesdays. Social group Wednesday afternoons. Prefers Saturday community outings.',
    likesAndPreferences: 'Passionate about AFL (Collingwood supporter). Enjoys movies, board games, and pub lunches with mates. Prefers male support workers.',
    communicationNeeds: 'Clear verbal communicator. No communication aids needed. Appreciates direct, honest communication style.',
    riskNotes: 'Pressure injury risk - requires regular repositioning. Manual handling plan in place for transfers. Uses ceiling hoist in bathroom.',
    medicalInfo: 'Conditions: Spinal cord injury (T6), neurogenic bladder. Medications: Baclofen 10mg TDS, Oxybutynin 5mg BD. Allergies: Nil known. GP: Dr. Andrew Ross, Reservoir Medical.',
    alliedHealthContacts: [
      { id: 'ah-2a', name: 'Dr. Andrew Ross', role: 'GP', phone: '03 9462 1100', email: 'reception@reservoirmedical.com.au' },
      { id: 'ah-2b', name: 'James Liu', role: 'Physiotherapist', phone: '0433 221 100', email: 'james@physioworks.com.au' },
    ],
    lastReviewedDate: '2026-01-10', nextReviewDueDate: '2026-07-10', createdAt: '2025-06-01', updatedAt: '2026-01-10',
  },
  {
    id: 'cp-3', clientId: 'client-7',
    goals: [
      { id: 'g-3a', description: 'Prepare a simple meal independently by end of plan period', targetDate: '2026-07-31', status: 'In Progress' },
      { id: 'g-3b', description: 'Attend day program 3 days per week consistently', targetDate: '2026-04-30', status: 'In Progress' },
      { id: 'g-3c', description: 'Develop a weekly self-care routine with visual prompts', targetDate: '2026-05-31', status: 'Not Started' },
    ],
    supportNeedsSummary: 'Priya benefits from structured, routine-based support. She is enthusiastic about learning new skills, particularly cooking. She attends a community day program and requires transport assistance.',
    preferredRoutines: 'Day program Tues/Thurs 9am-3pm. Home support Mon/Wed/Fri. Enjoys cooking on Wednesday afternoons. Meditation practice before bed.',
    likesAndPreferences: 'Loves cooking (especially Indian food), Bollywood movies, and dancing. Enjoys craft activities and visiting parks. Responds well to positive reinforcement.',
    communicationNeeds: 'Speaks English and Hindi. May use visual communication boards for complex topics. Responds well to visual schedules.',
    riskNotes: 'Risk of elopement in unfamiliar environments. Always maintain visual contact in community. Has a safety plan documented separately.',
    medicalInfo: 'Conditions: Autism spectrum disorder (Level 2), anxiety. Medications: Risperidone 1mg (evening). Allergies: Nil known. GP: Dr. Sarah Kim, Thornbury Clinic.',
    alliedHealthContacts: [
      { id: 'ah-3a', name: 'Dr. Sarah Kim', role: 'GP', phone: '03 9484 5500', email: 'admin@thornburyclinic.com.au' },
      { id: 'ah-3b', name: 'Anna Lee', role: 'Speech Pathologist', phone: '0455 334 221', email: 'anna@speechpath.com.au' },
      { id: 'ah-3c', name: 'Dr. Ravi Singh', role: 'Psychiatrist', phone: '03 9495 6600', email: 'rsingh@northernpsych.com.au' },
    ],
    lastReviewedDate: '2025-11-20', nextReviewDueDate: '2026-05-20', createdAt: '2025-08-01', updatedAt: '2025-11-20',
  },
];

// ─── CLIENT DOCUMENTS ──────────────────────────────
export const mockDocuments: ClientDocument[] = [
  { id: 'doc-1', clientId: 'client-1', name: 'NDIS Plan 2025-2026.pdf', fileType: 'pdf', uploadDate: '2025-07-01', size: '2.4 MB' },
  { id: 'doc-2', clientId: 'client-1', name: 'OT Assessment Report.pdf', fileType: 'pdf', uploadDate: '2025-09-15', size: '1.1 MB' },
  { id: 'doc-3', clientId: 'client-4', name: 'NDIS Plan 2025-2026.pdf', fileType: 'pdf', uploadDate: '2025-06-01', size: '3.2 MB' },
  { id: 'doc-4', clientId: 'client-4', name: 'Manual Handling Plan.pdf', fileType: 'pdf', uploadDate: '2025-08-20', size: '890 KB' },
  { id: 'doc-5', clientId: 'client-7', name: 'NDIS Plan 2025-2026.pdf', fileType: 'pdf', uploadDate: '2025-08-01', size: '2.8 MB' },
  { id: 'doc-6', clientId: 'client-2', name: 'NDIS Plan 2025-2026.pdf', fileType: 'pdf', uploadDate: '2025-09-01', size: '2.1 MB' },
];

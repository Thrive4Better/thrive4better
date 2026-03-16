/**
 * Seed script — inserts mock data into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { addDays, subDays, format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

// ─── Load env ────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Date helpers (same as mockData.ts) ──────────────
const today = new Date();
const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
const lastMonday = subWeeks(thisMonday, 1);
const nextMonday = addWeeks(thisMonday, 1);

function d(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ─── Helper: assert no error ─────────────────────────
function assertOk(label: string, error: any, data?: any) {
  if (error) {
    console.error(`[FAIL] ${label}:`, error.message ?? error);
    process.exit(1);
  }
  const count = Array.isArray(data) ? data.length : data ? 1 : 0;
  console.log(`  [OK] ${label} — ${count} row(s)`);
  return data;
}

// =====================================================================
// INLINE MOCK DATA  (copied from src/data/mockData.ts)
// =====================================================================

// ─── NDIS RATES ──────────────────────────────────────
const ndisRates = [
  { mockId: 'rate-1', support_item_name: 'Assistance with Daily Life - Standard', line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', unit: 'Hour', standard_rate: 67.56, evening_rate: 74.28, night_rate: 76.87, saturday_rate: 94.58, sunday_rate: 121.61, public_holiday_rate: 148.63 },
  { mockId: 'rate-2', support_item_name: 'Assistance with Daily Life - Level 2', line_item_code: '01_011_0107_1_1', support_category: '01 - Daily Activities', unit: 'Hour', standard_rate: 70.20, evening_rate: 77.18, night_rate: 79.88, saturday_rate: 98.28, sunday_rate: 126.36, public_holiday_rate: 154.44 },
  { mockId: 'rate-3', support_item_name: 'Community Access - Standard', line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', unit: 'Hour', standard_rate: 67.56, evening_rate: 74.28, night_rate: 76.87, saturday_rate: 94.58, sunday_rate: 121.61, public_holiday_rate: 148.63 },
  { mockId: 'rate-4', support_item_name: 'Community Access - Level 2', line_item_code: '04_105_0125_6_1', support_category: '04 - Assistance with Social', unit: 'Hour', standard_rate: 70.20, evening_rate: 77.18, night_rate: 79.88, saturday_rate: 98.28, sunday_rate: 126.36, public_holiday_rate: 154.44 },
  { mockId: 'rate-5', support_item_name: 'SIL - Standard Weekday', line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', unit: 'Hour', standard_rate: 58.70, evening_rate: 64.54, night_rate: 66.80, saturday_rate: 82.18, sunday_rate: 105.66, public_holiday_rate: 129.14 },
  { mockId: 'rate-6', support_item_name: 'Assist with Social & Community Participation', line_item_code: '04_102_0125_6_1', support_category: '04 - Assistance with Social', unit: 'Hour', standard_rate: 67.56, evening_rate: 74.28, night_rate: 76.87, saturday_rate: 94.58, sunday_rate: 121.61, public_holiday_rate: 148.63 },
  { mockId: 'rate-7', support_item_name: 'Transport - Community Access', line_item_code: '04_590_0125_6_1', support_category: '04 - Assistance with Social', unit: 'Hour', standard_rate: 67.56, evening_rate: 74.28, night_rate: 76.87, saturday_rate: 94.58, sunday_rate: 121.61, public_holiday_rate: 148.63 },
  { mockId: 'rate-8', support_item_name: 'Improved Daily Living Skills', line_item_code: '15_037_0117_1_3', support_category: '02 - Health & Wellbeing', unit: 'Hour', standard_rate: 193.99, evening_rate: 193.99, night_rate: 193.99, saturday_rate: 193.99, sunday_rate: 193.99, public_holiday_rate: 193.99 },
  { mockId: 'rate-9', support_item_name: 'Group Activities - 1:2 ratio', line_item_code: '04_400_0104_1_1', support_category: '04 - Assistance with Social', unit: 'Hour', standard_rate: 33.78, evening_rate: 37.14, night_rate: 38.44, saturday_rate: 47.29, sunday_rate: 60.81, public_holiday_rate: 74.32 },
  { mockId: 'rate-10', support_item_name: 'Assistance with Self-Care', line_item_code: '01_001_0107_1_1', support_category: '01 - Daily Activities', unit: 'Hour', standard_rate: 67.56, evening_rate: 74.28, night_rate: 76.87, saturday_rate: 94.58, sunday_rate: 121.61, public_holiday_rate: 148.63 },
];

// ─── CLIENTS ─────────────────────────────────────────
const clients = [
  { mockId: 'client-1', first_name: 'Sarah', last_name: 'Mitchell', date_of_birth: '1992-04-15', ndis_number: '431 287 650', address: '42 Smith Street', suburb: 'Fitzroy', postcode: '3065', phone: '0412 345 678', email: 'sarah.mitchell@email.com', emergency_contact_name: 'David Mitchell', emergency_contact_phone: '0413 987 654', preferred_communication: 'phone', funding_type: 'Plan Managed', plan_start_date: '2025-07-01', plan_end_date: '2026-06-30', plan_manager_name: 'Plan Partners Australia', plan_manager_email: 'claims@planpartners.com.au', plan_manager_phone: '1300 887 461', support_coordinator_name: 'Jennifer Walsh', support_coordinator_contact: '0421 555 789', status: 'Active', notes: 'Prefers morning appointments. Has a therapy dog named Biscuit.', created_at: '2024-06-15' },
  { mockId: 'client-2', first_name: 'James', last_name: 'Nguyen', date_of_birth: '1985-11-22', ndis_number: '431 456 789', address: '15 High Street', suburb: 'Northcote', postcode: '3070', phone: '0423 456 789', email: 'james.nguyen@email.com', emergency_contact_name: 'Linh Nguyen', emergency_contact_phone: '0424 111 222', preferred_communication: 'email', funding_type: 'Agency Managed', plan_start_date: '2025-09-01', plan_end_date: '2026-08-31', plan_manager_name: 'NDIA', plan_manager_email: '', plan_manager_phone: '1800 800 110', support_coordinator_name: 'Mark Thompson', support_coordinator_contact: '0432 666 777', status: 'Active', notes: 'Requires Vietnamese interpreter for complex discussions.', created_at: '2024-08-10' },
  { mockId: 'client-3', first_name: 'Emma', last_name: 'Williams', date_of_birth: '1998-02-08', ndis_number: '431 789 012', address: '88 Plenty Road', suburb: 'Preston', postcode: '3072', phone: '0434 567 890', email: 'emma.w@email.com', emergency_contact_name: 'Karen Williams', emergency_contact_phone: '0435 222 333', preferred_communication: 'text', funding_type: 'Self Managed', plan_start_date: '2025-04-01', plan_end_date: '2026-03-31', plan_manager_name: '', plan_manager_email: '', plan_manager_phone: '', support_coordinator_name: 'Rachel Green', support_coordinator_contact: '0443 888 999', status: 'Active', notes: 'Very independent. Loves art and music therapy.', created_at: '2024-03-20' },
  { mockId: 'client-4', first_name: 'Michael', last_name: "O'Brien", date_of_birth: '1978-08-30', ndis_number: '431 012 345', address: '201 Broadway', suburb: 'Reservoir', postcode: '3073', phone: '0445 678 901', email: 'michael.obrien@email.com', emergency_contact_name: "Fiona O'Brien", emergency_contact_phone: '0446 333 444', preferred_communication: 'phone', funding_type: 'Plan Managed', plan_start_date: '2025-06-01', plan_end_date: '2026-05-31', plan_manager_name: 'My Plan Manager', plan_manager_email: 'invoices@myplanmanager.com.au', plan_manager_phone: '1800 951 272', support_coordinator_name: 'David Chen', support_coordinator_contact: '0454 777 888', status: 'Active', notes: 'Wheelchair user. Requires accessible transport.', created_at: '2024-05-01' },
  { mockId: 'client-5', first_name: 'Aisha', last_name: 'Hassan', date_of_birth: '2001-06-12', ndis_number: '431 234 567', address: '56 Sydney Road', suburb: 'Brunswick', postcode: '3056', phone: '0456 789 012', email: 'aisha.h@email.com', emergency_contact_name: 'Fatima Hassan', emergency_contact_phone: '0457 444 555', preferred_communication: 'text', funding_type: 'Plan Managed', plan_start_date: '2025-10-01', plan_end_date: '2026-09-30', plan_manager_name: 'First Choice Plan Managers', plan_manager_email: 'claims@firstchoicepm.com.au', plan_manager_phone: '1300 365 028', support_coordinator_name: 'Sarah Ahmed', support_coordinator_contact: '0465 999 000', status: 'Active', notes: 'University student. Flexible scheduling needed.', created_at: '2024-09-15' },
  { mockId: 'client-6', first_name: 'Robert', last_name: 'Taylor', date_of_birth: '1965-12-03', ndis_number: '431 567 890', address: '77 Bell Street', suburb: 'Coburg', postcode: '3058', phone: '0467 890 123', email: 'rob.taylor@email.com', emergency_contact_name: 'Margaret Taylor', emergency_contact_phone: '0468 555 666', preferred_communication: 'phone', funding_type: 'Agency Managed', plan_start_date: '2025-03-01', plan_end_date: '2026-02-28', plan_manager_name: 'NDIA', plan_manager_email: '', plan_manager_phone: '1800 800 110', support_coordinator_name: 'Lisa Park', support_coordinator_contact: '0476 111 222', status: 'On Hold', notes: 'Plan under review. Awaiting reassessment.', created_at: '2024-02-28' },
  { mockId: 'client-7', first_name: 'Priya', last_name: 'Sharma', date_of_birth: '1990-09-18', ndis_number: '431 890 123', address: '33 Hutton Street', suburb: 'Thornbury', postcode: '3071', phone: '0478 901 234', email: 'priya.sharma@email.com', emergency_contact_name: 'Raj Sharma', emergency_contact_phone: '0479 666 777', preferred_communication: 'email', funding_type: 'Plan Managed', plan_start_date: '2025-08-01', plan_end_date: '2026-07-31', plan_manager_name: 'Plan Partners Australia', plan_manager_email: 'claims@planpartners.com.au', plan_manager_phone: '1300 887 461', support_coordinator_name: 'Jennifer Walsh', support_coordinator_contact: '0421 555 789', status: 'Active', notes: 'Attends day program Tues/Thurs. Loves cooking.', created_at: '2024-07-20' },
  { mockId: 'client-8', first_name: 'Thomas', last_name: 'Anderson', date_of_birth: '1973-03-25', ndis_number: '431 345 678', address: '12 Doncaster Road', suburb: 'Doncaster', postcode: '3108', phone: '0489 012 345', email: 'tom.anderson@email.com', emergency_contact_name: 'Julie Anderson', emergency_contact_phone: '0490 777 888', preferred_communication: 'phone', funding_type: 'Self Managed', plan_start_date: '2025-01-01', plan_end_date: '2025-12-31', plan_manager_name: '', plan_manager_email: '', plan_manager_phone: '', support_coordinator_name: 'Mark Thompson', support_coordinator_contact: '0432 666 777', status: 'Inactive', notes: 'Moved to another provider temporarily.', created_at: '2024-01-10' },
];

// ─── CLIENT SUPPORT CATEGORIES ───────────────────────
// clientMockId -> array of categories
const clientSupportCategories: Record<string, { category_id: string; category_name: string; allocated_budget: number; spent_amount: number }[]> = {
  'client-1': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 24500, spent_amount: 18200 },
    { category_id: 'cat-2', category_name: '04 - Assistance with Social', allocated_budget: 12000, spent_amount: 6800 },
  ],
  'client-2': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 32000, spent_amount: 14500 },
    { category_id: 'cat-3', category_name: '03 - SIL', allocated_budget: 85000, spent_amount: 52000 },
  ],
  'client-3': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 18000, spent_amount: 12300 },
    { category_id: 'cat-2', category_name: '04 - Assistance with Social', allocated_budget: 15000, spent_amount: 9200 },
  ],
  'client-4': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 28000, spent_amount: 19600 },
    { category_id: 'cat-2', category_name: '04 - Assistance with Social', allocated_budget: 9500, spent_amount: 4300 },
    { category_id: 'cat-4', category_name: '02 - Health & Wellbeing', allocated_budget: 6000, spent_amount: 3800 },
  ],
  'client-5': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 15000, spent_amount: 8900 },
    { category_id: 'cat-2', category_name: '04 - Assistance with Social', allocated_budget: 20000, spent_amount: 11000 },
  ],
  'client-6': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 22000, spent_amount: 22000 },
  ],
  'client-7': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 20000, spent_amount: 10500 },
    { category_id: 'cat-2', category_name: '04 - Assistance with Social', allocated_budget: 16000, spent_amount: 7200 },
    { category_id: 'cat-4', category_name: '02 - Health & Wellbeing', allocated_budget: 4000, spent_amount: 1600 },
  ],
  'client-8': [
    { category_id: 'cat-1', category_name: '01 - Daily Activities', allocated_budget: 30000, spent_amount: 5400 },
  ],
};

// ─── CARERS ──────────────────────────────────────────
const carers = [
  { mockId: 'carer-1', first_name: 'Lucy', last_name: 'Chen', phone: '0401 234 567', email: 'lucy.chen@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling', 'Medication Administration'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active', notes: 'Senior support worker. Specialises in complex care.', created_at: '2023-11-01' },
  { mockId: 'carer-2', first_name: 'Daniel', last_name: 'Osei', phone: '0402 345 678', email: 'daniel.osei@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'], status: 'Active', notes: 'Great with community access activities.', created_at: '2024-01-15' },
  { mockId: 'carer-3', first_name: 'Sophie', last_name: 'Martinez', phone: '0403 456 789', email: 'sophie.martinez@thrive4better.com.au', role: 'Team Leader', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling', 'Medication Administration'], availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], status: 'Active', notes: 'Team leader for SIL house in Reservoir.', created_at: '2023-09-20' },
  { mockId: 'carer-4', first_name: 'Rahul', last_name: 'Patel', phone: '0404 567 890', email: 'rahul.patel@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening'], availability: ['Thursday', 'Friday', 'Saturday', 'Sunday'], status: 'Active', notes: 'Part-time. Available mostly weekends.', created_at: '2024-03-10' },
  { mockId: 'carer-5', first_name: 'Megan', last_name: 'Foster', phone: '0405 678 901', email: 'megan.foster@thrive4better.com.au', role: 'Support Worker', qualifications: ['First Aid', 'NDIS Worker Screening', 'Manual Handling'], availability: ['Monday', 'Wednesday', 'Friday'], status: 'On Leave', notes: 'On annual leave until 24 March.', created_at: '2024-02-05' },
];

// ─── SHIFTS ──────────────────────────────────────────
interface ShiftRow {
  mockId: string;
  clientMockId: string;
  carerMockId: string;
  date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  support_category: string;
  ndis_line_item_code: string;
  hourly_rate: number;
  total_amount: number;
  hours: number;
  notes: string;
  status: string;
  convert_to_invoice: boolean;
  created_at: string;
}

function makeShiftRow(
  mockId: string, clientMockId: string, carerMockId: string,
  date: Date, start: string, end: string,
  serviceType: string, status: string,
  cat: string, code: string, rate: number, notes: string = '',
): ShiftRow {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100;
  return {
    mockId, clientMockId, carerMockId,
    date: d(date), start_time: start, end_time: end,
    service_type: serviceType, support_category: cat,
    ndis_line_item_code: code, hourly_rate: rate,
    total_amount: Math.round(hours * rate * 100) / 100,
    hours, notes, status,
    convert_to_invoice: status === 'Completed',
    created_at: d(subDays(date, 7)),
  };
}

const shifts: ShiftRow[] = [
  // LAST WEEK (completed)
  makeShiftRow('shift-01', 'client-1', 'carer-1', lastMonday, '09:00', '13:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine support and meal prep'),
  makeShiftRow('shift-02', 'client-2', 'carer-2', lastMonday, '14:00', '18:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Shopping and community outing'),
  makeShiftRow('shift-03', 'client-3', 'carer-1', addDays(lastMonday, 1), '10:00', '14:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Personal care and light housework'),
  makeShiftRow('shift-04', 'client-4', 'carer-3', addDays(lastMonday, 1), '08:00', '16:00', 'SIL', 'Completed', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShiftRow('shift-05', 'client-5', 'carer-2', addDays(lastMonday, 2), '09:00', '12:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShiftRow('shift-06', 'client-7', 'carer-1', addDays(lastMonday, 3), '10:00', '14:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Cooking skills and daily living'),
  makeShiftRow('shift-07', 'client-1', 'carer-4', addDays(lastMonday, 4), '09:00', '13:00', 'Daily Living', 'Completed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'End of week support'),
  makeShiftRow('shift-08', 'client-2', 'carer-4', addDays(lastMonday, 5), '10:00', '15:00', 'Community Access', 'Completed', '04 - Assistance with Social', '04_104_0125_6_1', 94.58, 'Saturday community outing'),
  // THIS WEEK
  makeShiftRow('shift-09', 'client-1', 'carer-1', thisMonday, '09:00', '13:00', 'Daily Living', 'Confirmed', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine support'),
  makeShiftRow('shift-10', 'client-3', 'carer-2', thisMonday, '14:00', '17:00', 'Community Access', 'Confirmed', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Art class transport'),
  makeShiftRow('shift-11', 'client-4', 'carer-3', addDays(thisMonday, 1), '08:00', '16:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShiftRow('shift-12', 'client-5', 'carer-2', addDays(thisMonday, 1), '09:00', '12:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShiftRow('shift-13', 'client-7', 'carer-1', addDays(thisMonday, 2), '10:00', '14:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Day program support'),
  makeShiftRow('shift-14', 'client-2', 'carer-3', addDays(thisMonday, 2), '14:00', '18:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL afternoon shift'),
  makeShiftRow('shift-15', 'client-1', 'carer-1', addDays(thisMonday, 3), '09:00', '12:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning support'),
  makeShiftRow('shift-16', 'client-3', 'carer-4', addDays(thisMonday, 4), '10:00', '15:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Personal care and outing'),
  makeShiftRow('shift-17', 'client-5', 'carer-2', addDays(thisMonday, 4), '13:00', '16:00', 'Social/Rec', 'Scheduled', '04 - Assistance with Social', '04_102_0125_6_1', 67.56, 'Social activity'),
  makeShiftRow('shift-18', 'client-4', 'carer-4', addDays(thisMonday, 5), '09:00', '14:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 94.58, 'Saturday community access'),
  // NEXT WEEK
  makeShiftRow('shift-19', 'client-1', 'carer-1', nextMonday, '09:00', '13:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Morning routine'),
  makeShiftRow('shift-20', 'client-2', 'carer-2', nextMonday, '14:00', '18:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'Community outing'),
  makeShiftRow('shift-21', 'client-4', 'carer-3', addDays(nextMonday, 1), '08:00', '16:00', 'SIL', 'Scheduled', '03 - SIL', '03_001_0104_1_1', 58.70, 'SIL day shift'),
  makeShiftRow('shift-22', 'client-7', 'carer-1', addDays(nextMonday, 2), '10:00', '14:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Day program'),
  makeShiftRow('shift-23', 'client-5', 'carer-2', addDays(nextMonday, 3), '09:00', '12:00', 'Community Access', 'Scheduled', '04 - Assistance with Social', '04_104_0125_6_1', 67.56, 'University support'),
  makeShiftRow('shift-24', 'client-3', 'carer-4', addDays(nextMonday, 4), '10:00', '15:00', 'Daily Living', 'Scheduled', '01 - Daily Activities', '01_002_0107_1_1', 67.56, 'Friday support session'),
];

// ─── INVOICES ────────────────────────────────────────
interface InvoiceRow {
  mockId: string;
  clientMockId: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  reference_number: string;
  notes_to_client: string;
  subtotal: number;
  gst_applicable: boolean;
  gst_amount: number;
  total: number;
  status: string;
  created_at: string;
  lineItems: { mockId: string; date: string; description: string; ndis_line_item_code: string; support_category: string; hours: number; rate: number; amount: number }[];
}

const invoices: InvoiceRow[] = [
  {
    mockId: 'inv-1', clientMockId: 'client-1', invoice_number: 'T4B-2026-001', invoice_date: '2026-02-01', due_date: '2026-02-15', period_start: '2026-01-01', period_end: '2026-01-31', reference_number: '', notes_to_client: '', subtotal: 1621.44, gst_applicable: false, gst_amount: 0, total: 1621.44, status: 'Paid', created_at: '2026-02-01',
    lineItems: [
      { mockId: 'li-1a', date: '2026-01-06', description: 'Assistance with Daily Life - Morning routine', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-1b', date: '2026-01-10', description: 'Assistance with Daily Life - Personal care', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-1c', date: '2026-01-13', description: 'Assistance with Daily Life - Meal prep', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-1d', date: '2026-01-17', description: 'Community Access - Shopping trip', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-1e', date: '2026-01-20', description: 'Assistance with Daily Life - Weekly support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-1f', date: '2026-01-25', description: 'Community Access - Saturday outing', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 4.3, rate: 94.58, amount: 405.36 },
    ],
  },
  {
    mockId: 'inv-2', clientMockId: 'client-2', invoice_number: 'T4B-2026-002', invoice_date: '2026-02-01', due_date: '2026-02-15', period_start: '2026-01-01', period_end: '2026-01-31', reference_number: 'PO-2026-JN', notes_to_client: '', subtotal: 2810.40, gst_applicable: false, gst_amount: 0, total: 2810.40, status: 'Paid', created_at: '2026-02-01',
    lineItems: [
      { mockId: 'li-2a', date: '2026-01-07', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-2b', date: '2026-01-14', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-2c', date: '2026-01-21', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-2d', date: '2026-01-28', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-2e', date: '2026-01-11', description: 'Community Access - Saturday outing', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 4, rate: 94.58, amount: 378.32 },
      { mockId: 'li-2f', date: '2026-01-18', description: 'Community Access - Weekend activity', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 5.83, rate: 94.58, amount: 553.68 },
    ],
  },
  {
    mockId: 'inv-3', clientMockId: 'client-4', invoice_number: 'T4B-2026-003', invoice_date: '2026-02-05', due_date: '2026-02-19', period_start: '2026-01-01', period_end: '2026-01-31', reference_number: '', notes_to_client: '', subtotal: 1486.32, gst_applicable: false, gst_amount: 0, total: 1486.32, status: 'Paid', created_at: '2026-02-05',
    lineItems: [
      { mockId: 'li-3a', date: '2026-01-08', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-3b', date: '2026-01-15', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-3c', date: '2026-01-22', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-3d', date: '2026-01-12', description: 'Community Access - Saturday transport', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3.5, rate: 94.58, amount: 331.03 },
      { mockId: 'li-3e', date: '2026-01-29', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 3.5, rate: 67.56, amount: 344.57 },
    ],
  },
  {
    mockId: 'inv-4', clientMockId: 'client-1', invoice_number: 'T4B-2026-004', invoice_date: '2026-03-01', due_date: '2026-03-15', period_start: '2026-02-01', period_end: '2026-02-28', reference_number: '', notes_to_client: '', subtotal: 1351.20, gst_applicable: false, gst_amount: 0, total: 1351.20, status: 'Sent', created_at: '2026-03-01',
    lineItems: [
      { mockId: 'li-4a', date: '2026-02-03', description: 'Assistance with Daily Life - Morning routine', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-4b', date: '2026-02-10', description: 'Assistance with Daily Life - Personal care', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-4c', date: '2026-02-17', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-4d', date: '2026-02-24', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-4e', date: '2026-02-21', description: 'Assistance with Daily Life - Meal prep', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
    ],
  },
  {
    mockId: 'inv-5', clientMockId: 'client-3', invoice_number: 'T4B-2026-005', invoice_date: '2026-03-01', due_date: '2026-03-15', period_start: '2026-02-01', period_end: '2026-02-28', reference_number: '', notes_to_client: '', subtotal: 1756.56, gst_applicable: false, gst_amount: 0, total: 1756.56, status: 'Sent', created_at: '2026-03-01',
    lineItems: [
      { mockId: 'li-5a', date: '2026-02-04', description: 'Assistance with Daily Life - Personal care', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-5b', date: '2026-02-07', description: 'Community Access - Art class', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-5c', date: '2026-02-11', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-5d', date: '2026-02-14', description: 'Community Access - Music therapy', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-5e', date: '2026-02-18', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
      { mockId: 'li-5f', date: '2026-02-25', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 3.5, rate: 67.56, amount: 472.92 },
    ],
  },
  {
    mockId: 'inv-6', clientMockId: 'client-5', invoice_number: 'T4B-2026-006', invoice_date: '2026-03-01', due_date: '2026-03-15', period_start: '2026-02-01', period_end: '2026-02-28', reference_number: '', notes_to_client: '', subtotal: 1013.40, gst_applicable: false, gst_amount: 0, total: 1013.40, status: 'Sent', created_at: '2026-03-01',
    lineItems: [
      { mockId: 'li-6a', date: '2026-02-05', description: 'Community Access - University support', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-6b', date: '2026-02-12', description: 'Community Access - University support', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-6c', date: '2026-02-19', description: 'Community Access - University support', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-6d', date: '2026-02-26', description: 'Community Access - University support', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-6e', date: '2026-02-22', description: 'Social/Rec - Weekend activity', ndis_line_item_code: '04_102_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
    ],
  },
  {
    mockId: 'inv-7', clientMockId: 'client-7', invoice_number: 'T4B-2026-007', invoice_date: '2026-03-01', due_date: '2026-03-15', period_start: '2026-02-01', period_end: '2026-02-28', reference_number: '', notes_to_client: '', subtotal: 1148.52, gst_applicable: false, gst_amount: 0, total: 1148.52, status: 'Sent', created_at: '2026-03-01',
    lineItems: [
      { mockId: 'li-7a', date: '2026-02-06', description: 'Assistance with Daily Life - Day program', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-7b', date: '2026-02-13', description: 'Assistance with Daily Life - Cooking skills', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-7c', date: '2026-02-20', description: 'Assistance with Daily Life - Day program', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-7d', date: '2026-02-27', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
    ],
  },
  {
    mockId: 'inv-8', clientMockId: 'client-2', invoice_number: 'T4B-2025-011', invoice_date: '2025-12-01', due_date: '2025-12-15', period_start: '2025-11-01', period_end: '2025-11-30', reference_number: 'PO-2025-JN', notes_to_client: 'Please pay at your earliest convenience.', subtotal: 2345.60, gst_applicable: false, gst_amount: 0, total: 2345.60, status: 'Overdue', created_at: '2025-12-01',
    lineItems: [
      { mockId: 'li-8a', date: '2025-11-04', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-8b', date: '2025-11-11', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-8c', date: '2025-11-18', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-8d', date: '2025-11-25', description: 'SIL - Day shift', ndis_line_item_code: '03_001_0104_1_1', support_category: '03 - SIL', hours: 8, rate: 58.70, amount: 469.60 },
      { mockId: 'li-8e', date: '2025-11-15', description: 'Community Access - Weekend', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 5, rate: 93.44, amount: 467.20 },
    ],
  },
  {
    mockId: 'inv-9', clientMockId: 'client-4', invoice_number: 'T4B-2025-012', invoice_date: '2026-01-05', due_date: '2026-01-19', period_start: '2025-12-01', period_end: '2025-12-31', reference_number: '', notes_to_client: '', subtotal: 1891.68, gst_applicable: false, gst_amount: 0, total: 1891.68, status: 'Overdue', created_at: '2026-01-05',
    lineItems: [
      { mockId: 'li-9a', date: '2025-12-02', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-9b', date: '2025-12-09', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-9c', date: '2025-12-16', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-9d', date: '2025-12-23', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-9e', date: '2025-12-07', description: 'Community Access - Saturday', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 4, rate: 94.58, amount: 378.32 },
      { mockId: 'li-9f', date: '2025-12-14', description: 'Community Access - Saturday', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3.5, rate: 94.58, amount: 432.40 },
    ],
  },
  {
    mockId: 'inv-10', clientMockId: 'client-3', invoice_number: 'T4B-2026-008', invoice_date: d(today), due_date: d(addDays(today, 14)), period_start: '2026-03-01', period_end: '2026-03-15', reference_number: '', notes_to_client: '', subtotal: 810.72, gst_applicable: false, gst_amount: 0, total: 810.72, status: 'Draft', created_at: d(today),
    lineItems: [
      { mockId: 'li-10a', date: '2026-03-03', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-10b', date: '2026-03-07', description: 'Community Access - Art class', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-10c', date: '2026-03-10', description: 'Assistance with Daily Life - Support', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 5, rate: 67.56, amount: 337.80 },
    ],
  },
  {
    mockId: 'inv-11', clientMockId: 'client-5', invoice_number: 'T4B-2026-009', invoice_date: d(today), due_date: d(addDays(today, 14)), period_start: '2026-03-01', period_end: '2026-03-15', reference_number: '', notes_to_client: '', subtotal: 608.04, gst_applicable: false, gst_amount: 0, total: 608.04, status: 'Draft', created_at: d(today),
    lineItems: [
      { mockId: 'li-11a', date: '2026-03-04', description: 'Community Access - University', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-11b', date: '2026-03-06', description: 'Social/Rec - Activity', ndis_line_item_code: '04_102_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
      { mockId: 'li-11c', date: '2026-03-11', description: 'Community Access - University', ndis_line_item_code: '04_104_0125_6_1', support_category: '04 - Assistance with Social', hours: 3, rate: 67.56, amount: 202.68 },
    ],
  },
  {
    mockId: 'inv-12', clientMockId: 'client-7', invoice_number: 'T4B-2026-010', invoice_date: d(today), due_date: d(addDays(today, 14)), period_start: '2026-03-01', period_end: '2026-03-15', reference_number: '', notes_to_client: '', subtotal: 540.48, gst_applicable: false, gst_amount: 0, total: 540.48, status: 'Draft', created_at: d(today),
    lineItems: [
      { mockId: 'li-12a', date: '2026-03-05', description: 'Assistance with Daily Life - Day program', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
      { mockId: 'li-12b', date: '2026-03-12', description: 'Assistance with Daily Life - Cooking', ndis_line_item_code: '01_002_0107_1_1', support_category: '01 - Daily Activities', hours: 4, rate: 67.56, amount: 270.24 },
    ],
  },
];

// ─── CARE PLANS ──────────────────────────────────────
interface CarePlanRow {
  mockId: string;
  clientMockId: string;
  support_needs_summary: string;
  preferred_routines: string;
  likes_and_preferences: string;
  communication_needs: string;
  risk_notes: string;
  medical_info: string;
  last_reviewed_date: string;
  next_review_due_date: string;
  created_at: string;
  updated_at: string;
  goals: { mockId: string; description: string; target_date: string; status: string }[];
  alliedHealthContacts: { mockId: string; name: string; role: string; phone: string; email: string }[];
}

const carePlans: CarePlanRow[] = [
  {
    mockId: 'cp-1', clientMockId: 'client-1',
    support_needs_summary: 'Sarah requires support with daily living activities including personal care, meal preparation, and household tasks. She benefits from consistent routines and gentle encouragement to build independence.',
    preferred_routines: 'Mornings: Wake at 7:30am, breakfast routine, medication. Support sessions preferred between 9am-1pm. Walks therapy dog Biscuit at 3pm daily.',
    likes_and_preferences: 'Loves cooking (especially baking), music therapy, and spending time with therapy dog Biscuit. Enjoys gardening and craft activities. Prefers female support workers for personal care.',
    communication_needs: 'Communicates well verbally. May need extra time to process complex information. Responds well to visual schedules and written lists.',
    risk_notes: 'Low falls risk. Can become anxious in crowded environments. Has an action plan for anxiety episodes \u2014 see medical folder.',
    medical_info: 'Conditions: Anxiety disorder, mild intellectual disability. Medications: Sertraline 50mg daily (morning). Allergies: Penicillin. GP: Dr. Kim Patel, Fitzroy Medical Centre.',
    last_reviewed_date: '2025-12-15', next_review_due_date: '2026-06-15', created_at: '2025-07-01', updated_at: '2025-12-15',
    goals: [
      { mockId: 'g-1a', description: 'Develop independent meal preparation skills for 3 meals per week', target_date: '2026-03-31', status: 'In Progress' },
      { mockId: 'g-1b', description: 'Attend community gym sessions twice per week', target_date: '2026-06-30', status: 'In Progress' },
      { mockId: 'g-1c', description: 'Build confidence to use public transport independently', target_date: '2026-06-30', status: 'Not Started' },
    ],
    alliedHealthContacts: [
      { mockId: 'ah-1a', name: 'Dr. Kim Patel', role: 'GP', phone: '03 9415 2200', email: 'reception@fitzroymedical.com.au' },
      { mockId: 'ah-1b', name: 'Tanya Brooks', role: 'Occupational Therapist', phone: '0412 998 877', email: 'tanya@alliedot.com.au' },
      { mockId: 'ah-1c', name: 'Dr. Mia Chen', role: 'Psychologist', phone: '03 9481 3300', email: 'mia.chen@mindmatters.com.au' },
    ],
  },
  {
    mockId: 'cp-2', clientMockId: 'client-4',
    support_needs_summary: 'Michael uses a powered wheelchair and requires assistance with transfers, personal care, and community access. He is motivated to maintain his physical abilities and social connections.',
    preferred_routines: 'Morning routine starts at 7am. Enjoys an early start. Attends physio on Tuesdays. Social group Wednesday afternoons. Prefers Saturday community outings.',
    likes_and_preferences: 'Passionate about AFL (Collingwood supporter). Enjoys movies, board games, and pub lunches with mates. Prefers male support workers.',
    communication_needs: 'Clear verbal communicator. No communication aids needed. Appreciates direct, honest communication style.',
    risk_notes: 'Pressure injury risk \u2014 requires regular repositioning. Manual handling plan in place for transfers. Uses ceiling hoist in bathroom.',
    medical_info: 'Conditions: Spinal cord injury (T6), neurogenic bladder. Medications: Baclofen 10mg TDS, Oxybutynin 5mg BD. Allergies: Nil known. GP: Dr. Andrew Ross, Reservoir Medical.',
    last_reviewed_date: '2026-01-10', next_review_due_date: '2026-07-10', created_at: '2025-06-01', updated_at: '2026-01-10',
    goals: [
      { mockId: 'g-2a', description: 'Maintain current level of independent transfers with minimal assistance', target_date: '2026-05-31', status: 'In Progress' },
      { mockId: 'g-2b', description: 'Participate in weekly community social group', target_date: '2026-03-31', status: 'Achieved' },
      { mockId: 'g-2c', description: 'Develop skills to manage personal finances with support', target_date: '2026-12-31', status: 'Not Started' },
    ],
    alliedHealthContacts: [
      { mockId: 'ah-2a', name: 'Dr. Andrew Ross', role: 'GP', phone: '03 9462 1100', email: 'reception@reservoirmedical.com.au' },
      { mockId: 'ah-2b', name: 'James Liu', role: 'Physiotherapist', phone: '0433 221 100', email: 'james@physioworks.com.au' },
    ],
  },
  {
    mockId: 'cp-3', clientMockId: 'client-7',
    support_needs_summary: 'Priya benefits from structured, routine-based support. She is enthusiastic about learning new skills, particularly cooking. She attends a community day program and requires transport assistance.',
    preferred_routines: 'Day program Tues/Thurs 9am-3pm. Home support Mon/Wed/Fri. Enjoys cooking on Wednesday afternoons. Meditation practice before bed.',
    likes_and_preferences: 'Loves cooking (especially Indian food), Bollywood movies, and dancing. Enjoys craft activities and visiting parks. Responds well to positive reinforcement.',
    communication_needs: 'Speaks English and Hindi. May use visual communication boards for complex topics. Responds well to visual schedules.',
    risk_notes: 'Risk of elopement in unfamiliar environments. Always maintain visual contact in community. Has a safety plan documented separately.',
    medical_info: 'Conditions: Autism spectrum disorder (Level 2), anxiety. Medications: Risperidone 1mg (evening). Allergies: Nil known. GP: Dr. Sarah Kim, Thornbury Clinic.',
    last_reviewed_date: '2025-11-20', next_review_due_date: '2026-05-20', created_at: '2025-08-01', updated_at: '2025-11-20',
    goals: [
      { mockId: 'g-3a', description: 'Prepare a simple meal independently by end of plan period', target_date: '2026-07-31', status: 'In Progress' },
      { mockId: 'g-3b', description: 'Attend day program 3 days per week consistently', target_date: '2026-04-30', status: 'In Progress' },
      { mockId: 'g-3c', description: 'Develop a weekly self-care routine with visual prompts', target_date: '2026-05-31', status: 'Not Started' },
    ],
    alliedHealthContacts: [
      { mockId: 'ah-3a', name: 'Dr. Sarah Kim', role: 'GP', phone: '03 9484 5500', email: 'admin@thornburyclinic.com.au' },
      { mockId: 'ah-3b', name: 'Anna Lee', role: 'Speech Pathologist', phone: '0455 334 221', email: 'anna@speechpath.com.au' },
      { mockId: 'ah-3c', name: 'Dr. Ravi Singh', role: 'Psychiatrist', phone: '03 9495 6600', email: 'rsingh@northernpsych.com.au' },
    ],
  },
];

// ─── CLIENT DOCUMENTS ────────────────────────────────
const documents = [
  { mockId: 'doc-1', clientMockId: 'client-1', name: 'NDIS Plan 2025-2026.pdf', file_type: 'pdf', upload_date: '2025-07-01', size: '2.4 MB' },
  { mockId: 'doc-2', clientMockId: 'client-1', name: 'OT Assessment Report.pdf', file_type: 'pdf', upload_date: '2025-09-15', size: '1.1 MB' },
  { mockId: 'doc-3', clientMockId: 'client-4', name: 'NDIS Plan 2025-2026.pdf', file_type: 'pdf', upload_date: '2025-06-01', size: '3.2 MB' },
  { mockId: 'doc-4', clientMockId: 'client-4', name: 'Manual Handling Plan.pdf', file_type: 'pdf', upload_date: '2025-08-20', size: '890 KB' },
  { mockId: 'doc-5', clientMockId: 'client-7', name: 'NDIS Plan 2025-2026.pdf', file_type: 'pdf', upload_date: '2025-08-01', size: '2.8 MB' },
  { mockId: 'doc-6', clientMockId: 'client-2', name: 'NDIS Plan 2025-2026.pdf', file_type: 'pdf', upload_date: '2025-09-01', size: '2.1 MB' },
];

// =====================================================================
// SEED LOGIC
// =====================================================================

async function seed() {
  console.log('=== Thrive4Better Seed Script ===\n');

  // ID mappings: mockId -> Supabase UUID
  const clientMap = new Map<string, string>();
  const carerMap = new Map<string, string>();
  const shiftMap = new Map<string, string>();
  const invoiceMap = new Map<string, string>();
  const carePlanMap = new Map<string, string>();

  // ─── 1. Clear existing data (reverse dependency order) ───
  console.log('Clearing existing data...');
  for (const table of [
    'invoice_line_items',
    'invoices',
    'care_plan_goals',
    'allied_health_contacts',
    'care_plans',
    'shifts',
    'client_documents',
    'client_support_categories',
    'carers',
    'clients',
    'ndis_rates',
  ]) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`  [WARN] Could not clear ${table}: ${error.message}`);
    } else {
      console.log(`  [OK] Cleared ${table}`);
    }
  }

  // ─── 2. Insert ndis_rates ──────────────────────────────
  console.log('\nInserting ndis_rates...');
  const rateRows = ndisRates.map(({ mockId, ...rest }) => rest);
  {
    const { data, error } = await supabase.from('ndis_rates').insert(rateRows).select();
    assertOk('ndis_rates', error, data);
  }

  // ─── 3. Insert clients ────────────────────────────────
  console.log('\nInserting clients...');
  for (const { mockId, ...row } of clients) {
    const { data, error } = await supabase.from('clients').insert(row).select().single();
    assertOk(`client ${mockId}`, error, data);
    if (data) clientMap.set(mockId, data.id);
  }

  // ─── 4. Insert client_support_categories ───────────────
  console.log('\nInserting client_support_categories...');
  for (const [clientMockId, cats] of Object.entries(clientSupportCategories)) {
    const clientId = clientMap.get(clientMockId);
    if (!clientId) continue;
    const rows = cats.map(({ category_id: _cid, ...c }) => ({ client_id: clientId, ...c }));
    const { data, error } = await supabase.from('client_support_categories').insert(rows).select();
    assertOk(`support_categories for ${clientMockId}`, error, data);
  }

  // ─── 5. Insert carers ─────────────────────────────────
  console.log('\nInserting carers...');
  for (const { mockId, ...row } of carers) {
    const { data, error } = await supabase.from('carers').insert(row).select().single();
    assertOk(`carer ${mockId}`, error, data);
    if (data) carerMap.set(mockId, data.id);
  }

  // ─── 6. Insert shifts ─────────────────────────────────
  console.log('\nInserting shifts...');
  for (const { mockId, clientMockId, carerMockId, ...row } of shifts) {
    const client_id = clientMap.get(clientMockId);
    const carer_id = carerMap.get(carerMockId);
    if (!client_id || !carer_id) {
      console.error(`  [SKIP] shift ${mockId}: missing client or carer mapping`);
      continue;
    }
    const { data, error } = await supabase.from('shifts').insert({ ...row, client_id, carer_id }).select().single();
    assertOk(`shift ${mockId}`, error, data);
    if (data) shiftMap.set(mockId, data.id);
  }

  // ─── 7. Insert care_plans, goals, allied_health_contacts ─
  console.log('\nInserting care_plans...');
  for (const { mockId, clientMockId, goals, alliedHealthContacts, ...row } of carePlans) {
    const client_id = clientMap.get(clientMockId);
    if (!client_id) {
      console.error(`  [SKIP] care_plan ${mockId}: missing client mapping`);
      continue;
    }
    const { data, error } = await supabase.from('care_plans').insert({ ...row, client_id }).select().single();
    assertOk(`care_plan ${mockId}`, error, data);
    if (!data) continue;
    carePlanMap.set(mockId, data.id);

    // Goals
    if (goals.length > 0) {
      const goalRows = goals.map(({ mockId: _gid, ...g }) => ({ ...g, care_plan_id: data.id }));
      const { data: gData, error: gErr } = await supabase.from('care_plan_goals').insert(goalRows).select();
      assertOk(`  goals for ${mockId}`, gErr, gData);
    }

    // Allied health contacts
    if (alliedHealthContacts.length > 0) {
      const ahRows = alliedHealthContacts.map(({ mockId: _aid, ...a }) => ({ ...a, care_plan_id: data.id }));
      const { data: aData, error: aErr } = await supabase.from('allied_health_contacts').insert(ahRows).select();
      assertOk(`  allied_health for ${mockId}`, aErr, aData);
    }
  }

  // ─── 8. Insert invoices + line items ───────────────────
  console.log('\nInserting invoices...');
  for (const { mockId, clientMockId, lineItems, ...row } of invoices) {
    const client_id = clientMap.get(clientMockId);
    if (!client_id) {
      console.error(`  [SKIP] invoice ${mockId}: missing client mapping`);
      continue;
    }
    const { data, error } = await supabase.from('invoices').insert({ ...row, client_id }).select().single();
    assertOk(`invoice ${mockId}`, error, data);
    if (!data) continue;
    invoiceMap.set(mockId, data.id);

    if (lineItems.length > 0) {
      const liRows = lineItems.map(({ mockId: _lid, ...li }) => ({ ...li, invoice_id: data.id }));
      const { data: liData, error: liErr } = await supabase.from('invoice_line_items').insert(liRows).select();
      assertOk(`  line_items for ${mockId}`, liErr, liData);
    }
  }

  // ─── 9. Insert client_documents ────────────────────────
  console.log('\nInserting client_documents...');
  for (const { mockId, clientMockId, ...row } of documents) {
    const client_id = clientMap.get(clientMockId);
    if (!client_id) {
      console.error(`  [SKIP] document ${mockId}: missing client mapping`);
      continue;
    }
    const { data, error } = await supabase.from('client_documents').insert({ ...row, client_id }).select().single();
    assertOk(`document ${mockId}`, error, data);
  }

  // ─── Summary ───────────────────────────────────────────
  console.log('\n=== Seed complete ===');
  console.log(`  Clients:    ${clientMap.size}`);
  console.log(`  Carers:     ${carerMap.size}`);
  console.log(`  Shifts:     ${shiftMap.size}`);
  console.log(`  Care Plans: ${carePlanMap.size}`);
  console.log(`  Invoices:   ${invoiceMap.size}`);
  console.log(`  Documents:  ${documents.length}`);
}

seed().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

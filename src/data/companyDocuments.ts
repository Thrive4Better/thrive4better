// ── Company Document Library Data ──
// All 8 standard forms/documents for Thrive 4 Better Pty Ltd

export type DocumentCategory = 'Policies & Procedures' | 'Agreements & Contracts' | 'Templates';

export interface DocumentSection {
  title: string;
  content: string;
}

export interface DocumentField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'email' | 'tel' | 'select' | 'checkbox' | 'number';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
}

export interface CompanyDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  version: string;
  lastUpdated: string;
  description: string;
  isFillable: boolean;
  sections: DocumentSection[];
  fields: DocumentField[];
}

// ── Company Constants ──
const COMPANY = 'Thrive 4 Better Pty Ltd';
const ABN = '15 694 748 297';
const DIRECTOR = 'Melissa Manno';
const LOCATION = 'Melbourne, Victoria';
const EMAIL = 'info@thrive4better.com';
const PHONE = '0422 745 229';

export const companyDocuments: CompanyDocument[] = [
  // ────────────────────────────────────────────
  // 1. NDIS Support Plan Template
  // ────────────────────────────────────────────
  {
    id: 'ndis-support-plan',
    title: 'NDIS Support Plan Template',
    category: 'Templates',
    version: '2.1',
    lastUpdated: '2025-11-15',
    description: 'Comprehensive support plan template for NDIS participants including goals, support needs, risk assessment, and key contacts.',
    isFillable: false,
    sections: [
      {
        title: 'Participant Details',
        content: `This section captures the participant's personal information and NDIS plan details.

Participant Name: ____________________
Date of Birth: ____________________
NDIS Number: ____________________
Address: ____________________
Phone: ____________________
Email: ____________________
Preferred Communication Method: ____________________
NDIS Plan Start Date: ____________________
NDIS Plan End Date: ____________________
Funding Type: Agency Managed / Plan Managed / Self Managed
Plan Manager (if applicable): ____________________
Support Coordinator: ____________________`,
      },
      {
        title: 'Goals - Short Term (3-6 months)',
        content: `Identify specific, measurable goals that the participant aims to achieve within the next 3-6 months.

Goal 1: ____________________
  - Strategies: ____________________
  - Support Required: ____________________
  - Progress Indicators: ____________________

Goal 2: ____________________
  - Strategies: ____________________
  - Support Required: ____________________
  - Progress Indicators: ____________________

Goal 3: ____________________
  - Strategies: ____________________
  - Support Required: ____________________
  - Progress Indicators: ____________________`,
      },
      {
        title: 'Goals - Long Term (12+ months)',
        content: `Identify broader, aspirational goals aligned with the participant's vision for their future.

Goal 1: ____________________
  - Steps to Achieve: ____________________
  - Supports Needed: ____________________
  - Review Timeline: ____________________

Goal 2: ____________________
  - Steps to Achieve: ____________________
  - Supports Needed: ____________________
  - Review Timeline: ____________________`,
      },
      {
        title: 'Support Needs - Core Supports',
        content: `Core supports help the participant complete daily living activities.

Daily Living Supports:
  - Personal care requirements: ____________________
  - Meal preparation: ____________________
  - Household tasks: ____________________
  - Medication management: ____________________

Community Access:
  - Community participation activities: ____________________
  - Transport requirements: ____________________
  - Social and recreational needs: ____________________

Consumables:
  - Required consumables/equipment: ____________________`,
      },
      {
        title: 'Support Needs - Capacity Building',
        content: `Capacity building supports help the participant build independence and skills.

Support Coordination:
  - Level of support coordination required: ____________________
  - Key coordination tasks: ____________________

Improved Living Arrangements:
  - Housing goals: ____________________
  - Independent living skills: ____________________

Improved Daily Living Skills:
  - Skills development areas: ____________________
  - Therapy requirements: ____________________

Improved Social Skills:
  - Social participation goals: ____________________
  - Community connection plans: ____________________`,
      },
      {
        title: 'Support Needs - Capital Supports',
        content: `Capital supports include assistive technology and home modifications.

Assistive Technology:
  - Current AT in use: ____________________
  - Required AT: ____________________

Home Modifications:
  - Current modifications: ____________________
  - Required modifications: ____________________

Vehicle Modifications:
  - Required modifications: ____________________`,
      },
      {
        title: 'Key Contacts',
        content: `Emergency Contact 1:
  Name: ____________________
  Relationship: ____________________
  Phone: ____________________

Emergency Contact 2:
  Name: ____________________
  Relationship: ____________________
  Phone: ____________________

GP/Doctor:
  Name: ____________________
  Practice: ____________________
  Phone: ____________________

Allied Health Professionals:
  Name: ____________________
  Discipline: ____________________
  Phone: ____________________

Support Coordinator:
  Name: ____________________
  Organisation: ____________________
  Phone: ____________________
  Email: ____________________`,
      },
      {
        title: 'Risk Assessment',
        content: `Identified risks and management strategies:

Risk 1: ____________________
  - Likelihood: Low / Medium / High
  - Impact: Low / Medium / High
  - Mitigation Strategy: ____________________
  - Responsible Person: ____________________

Risk 2: ____________________
  - Likelihood: Low / Medium / High
  - Impact: Low / Medium / High
  - Mitigation Strategy: ____________________
  - Responsible Person: ____________________

Risk 3: ____________________
  - Likelihood: Low / Medium / High
  - Impact: Low / Medium / High
  - Mitigation Strategy: ____________________
  - Responsible Person: ____________________

Environmental Risks:
  - Home safety concerns: ____________________
  - Community safety concerns: ____________________

Health Risks:
  - Medical conditions: ____________________
  - Allergies: ____________________
  - Behavioural considerations: ____________________`,
      },
      {
        title: 'Sign-Off',
        content: `By signing below, all parties acknowledge that this Support Plan has been developed collaboratively and reflects the participant's goals and needs.

Participant/Nominee:
  Name: ____________________
  Signature: ____________________
  Date: ____________________

${COMPANY} Representative:
  Name: ${DIRECTOR}
  Position: Director
  Signature: ____________________
  Date: ____________________

Support Coordinator (if applicable):
  Name: ____________________
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [],
  },

  // ────────────────────────────────────────────
  // 2. Incident Report Form
  // ────────────────────────────────────────────
  {
    id: 'incident-report',
    title: 'Incident Report Form',
    category: 'Templates',
    version: '1.4',
    lastUpdated: '2025-12-01',
    description: 'Form for reporting and documenting incidents involving participants, staff, or third parties in accordance with NDIS requirements.',
    isFillable: true,
    sections: [
      {
        title: 'Incident Details',
        content: `Report Number: Auto-generated
Date of Incident: ____________________
Time of Incident: ____________________
Location of Incident: ____________________
Type of Incident: Injury / Near Miss / Behaviour / Medication / Property / Abuse or Neglect / Death / Other
Severity: Low / Medium / High / Critical
Is this a Reportable Incident under the NDIS Act? Yes / No`,
      },
      {
        title: 'Persons Involved',
        content: `Participant:
  Name: ____________________
  NDIS Number: ____________________

Staff/Contractor Involved:
  Name: ____________________
  Role: ____________________

Other Persons Involved:
  Name: ____________________
  Role/Relationship: ____________________`,
      },
      {
        title: 'Witnesses',
        content: `Witness 1:
  Name: ____________________
  Contact: ____________________
  Role/Relationship: ____________________

Witness 2:
  Name: ____________________
  Contact: ____________________
  Role/Relationship: ____________________`,
      },
      {
        title: 'Incident Description',
        content: `Provide a detailed, factual account of what happened. Include the sequence of events leading up to, during, and after the incident.

Description:
____________________
____________________
____________________
____________________

Contributing Factors:
____________________
____________________`,
      },
      {
        title: 'Immediate Actions Taken',
        content: `Describe all actions taken immediately following the incident:

First Aid Administered: Yes / No
  If yes, details: ____________________

Emergency Services Called: Yes / No
  If yes, which services: Ambulance / Police / Fire
  Arrival Time: ____________________

Participant Made Safe: Yes / No
  Details: ____________________

Other Immediate Actions:
____________________
____________________`,
      },
      {
        title: 'Notification Log',
        content: `Record all notifications made regarding this incident:

Participant's Family/Guardian:
  Notified: Yes / No
  Name: ____________________
  Date/Time: ____________________
  Method: Phone / Email / In Person

NDIS Quality & Safeguards Commission:
  Reported: Yes / No / N/A
  Date: ____________________
  Reference Number: ____________________

Police:
  Reported: Yes / No / N/A
  Date: ____________________
  Reference Number: ____________________

${COMPANY} Management:
  Notified: Yes / No
  Name: ____________________
  Date/Time: ____________________`,
      },
      {
        title: 'Follow-Up Actions',
        content: `Action 1: ____________________
  Responsible Person: ____________________
  Due Date: ____________________
  Status: Pending / In Progress / Complete

Action 2: ____________________
  Responsible Person: ____________________
  Due Date: ____________________
  Status: Pending / In Progress / Complete

Action 3: ____________________
  Responsible Person: ____________________
  Due Date: ____________________
  Status: Pending / In Progress / Complete

Root Cause Analysis Required: Yes / No
Review Date: ____________________`,
      },
      {
        title: 'Sign-Off',
        content: `Reported By:
  Name: ____________________
  Position: ____________________
  Signature: ____________________
  Date: ____________________

Reviewed By:
  Name: ____________________
  Position: ____________________
  Signature: ____________________
  Date: ____________________

Director Sign-Off:
  Name: ${DIRECTOR}
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [
      { key: 'reportNumber', label: 'Report Number', type: 'text', required: false, defaultValue: '', placeholder: 'Auto-generated' },
      { key: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
      { key: 'incidentTime', label: 'Time of Incident', type: 'text', required: true, placeholder: 'e.g. 14:30' },
      { key: 'location', label: 'Location of Incident', type: 'text', required: true },
      { key: 'incidentType', label: 'Type of Incident', type: 'select', required: true, options: ['Injury', 'Near Miss', 'Behaviour', 'Medication', 'Property', 'Abuse or Neglect', 'Death', 'Other'] },
      { key: 'severity', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { key: 'isReportable', label: 'Reportable Incident under NDIS Act', type: 'checkbox', required: false },
      { key: 'participantName', label: 'Participant Name', type: 'text', required: true },
      { key: 'participantNdis', label: 'Participant NDIS Number', type: 'text', required: false },
      { key: 'staffName', label: 'Staff/Contractor Involved', type: 'text', required: true },
      { key: 'staffRole', label: 'Staff Role', type: 'text', required: false },
      { key: 'otherPersons', label: 'Other Persons Involved', type: 'textarea', required: false },
      { key: 'witnessNames', label: 'Witness Names & Contacts', type: 'textarea', required: false },
      { key: 'description', label: 'Incident Description', type: 'textarea', required: true, placeholder: 'Provide a detailed, factual account of what happened...' },
      { key: 'contributingFactors', label: 'Contributing Factors', type: 'textarea', required: false },
      { key: 'firstAid', label: 'First Aid Administered', type: 'checkbox', required: false },
      { key: 'firstAidDetails', label: 'First Aid Details', type: 'textarea', required: false },
      { key: 'emergencyServicesCalled', label: 'Emergency Services Called', type: 'checkbox', required: false },
      { key: 'emergencyServicesDetails', label: 'Emergency Services Details', type: 'text', required: false },
      { key: 'immediateActions', label: 'Other Immediate Actions Taken', type: 'textarea', required: true },
      { key: 'familyNotified', label: 'Family/Guardian Notified', type: 'checkbox', required: false },
      { key: 'familyNotifiedName', label: 'Family Contact Name', type: 'text', required: false },
      { key: 'familyNotifiedDate', label: 'Family Notification Date', type: 'date', required: false },
      { key: 'ndisCommissionReported', label: 'Reported to NDIS Commission', type: 'checkbox', required: false },
      { key: 'ndisCommissionRef', label: 'NDIS Commission Reference', type: 'text', required: false },
      { key: 'followUpActions', label: 'Follow-Up Actions Required', type: 'textarea', required: false, placeholder: 'List each action, responsible person, and due date...' },
      { key: 'rootCauseRequired', label: 'Root Cause Analysis Required', type: 'checkbox', required: false },
      { key: 'reportedByName', label: 'Reported By (Name)', type: 'text', required: true },
      { key: 'reportedByPosition', label: 'Reported By (Position)', type: 'text', required: true },
      { key: 'reportDate', label: 'Report Date', type: 'date', required: true },
    ],
  },

  // ────────────────────────────────────────────
  // 3. Contractor Agreement
  // ────────────────────────────────────────────
  {
    id: 'contractor-agreement',
    title: 'Contractor Agreement',
    category: 'Agreements & Contracts',
    version: '3.0',
    lastUpdated: '2025-10-20',
    description: 'Independent contractor agreement for support workers and subcontractors, covering scope of services, NDIS compliance, insurance, and confidentiality.',
    isFillable: true,
    sections: [
      {
        title: '1. Parties',
        content: `This Contractor Agreement ("Agreement") is entered into as of the date of execution by:

Principal:
  ${COMPANY}
  ABN: ${ABN}
  Director: ${DIRECTOR}
  Address: ${LOCATION}
  Email: ${EMAIL}
  Phone: ${PHONE}

Contractor:
  Name: ____________________
  ABN/ACN: ____________________
  Address: ____________________
  Email: ____________________
  Phone: ____________________`,
      },
      {
        title: '2. Scope of Services',
        content: `2.1 The Contractor agrees to provide the following services ("Services") to the Principal:
  - NDIS support services to participants as directed by the Principal
  - Services may include but are not limited to: personal care, community access, social and recreational support, transport, domestic assistance, and skill-building activities
  - Services are to be delivered in accordance with the participant's NDIS Support Plan and any care plans developed by ${COMPANY}

2.2 The Contractor shall:
  (a) Perform the Services with due care, skill, and diligence
  (b) Comply with all applicable laws, regulations, and NDIS Practice Standards
  (c) Follow ${COMPANY}'s policies, procedures, and codes of conduct
  (d) Maintain accurate records of services delivered, including shift notes and incident reports
  (e) Attend mandatory training and professional development as required

2.3 The Contractor acknowledges that they are engaged as an independent contractor and not as an employee of ${COMPANY}.`,
      },
      {
        title: '3. Term',
        content: `3.1 This Agreement commences on ________________ ("Commencement Date") and continues until terminated in accordance with Clause 8.

3.2 There is no guaranteed minimum number of hours or shifts under this Agreement.

3.3 The Contractor is free to accept or decline shifts offered by the Principal.`,
      },
      {
        title: '4. Payment Terms',
        content: `4.1 The Principal shall pay the Contractor at the following rates:
  - Standard weekday rate: $____ per hour
  - Evening rate: $____ per hour
  - Saturday rate: $____ per hour
  - Sunday rate: $____ per hour
  - Public Holiday rate: $____ per hour

4.2 Payment will be made fortnightly / monthly (circle one) within 14 days of receiving a valid tax invoice from the Contractor.

4.3 The Contractor is responsible for their own:
  (a) Tax obligations, including GST registration if applicable
  (b) Superannuation
  (c) Income tax and PAYG
  (d) WorkCover/workers compensation insurance

4.4 The Contractor must provide a valid ABN and tax invoice for all services rendered.

4.5 Travel allowance: $____ per km (where applicable) for travel between participant locations.`,
      },
      {
        title: '5. NDIS Compliance',
        content: `5.1 The Contractor must at all times comply with:
  (a) The National Disability Insurance Scheme Act 2013 (Cth)
  (b) NDIS Practice Standards and Quality Indicators
  (c) NDIS Code of Conduct
  (d) NDIS Pricing Arrangements and Price Limits

5.2 The Contractor must maintain current:
  (a) NDIS Worker Screening Check clearance
  (b) Working with Children Check (where applicable)
  (c) First Aid and CPR certification
  (d) Any other qualifications required for the services to be provided

5.3 The Contractor must notify the Principal immediately if:
  (a) Any clearance or check is revoked, suspended, or subject to conditions
  (b) They become aware of any matter that may affect their ability to hold a clearance
  (c) Any reportable incident occurs during service delivery`,
      },
      {
        title: '6. Insurance',
        content: `6.1 The Contractor must maintain the following insurance coverage for the duration of this Agreement:
  (a) Public Liability Insurance: minimum $10,000,000
  (b) Professional Indemnity Insurance: minimum $5,000,000
  (c) Personal Accident/Income Protection Insurance
  (d) Motor Vehicle Insurance (if using personal vehicle for services)

6.2 The Contractor must provide copies of current certificates of currency to the Principal upon request.

6.3 The Contractor must notify the Principal if any insurance policy is cancelled, suspended, or not renewed.`,
      },
      {
        title: '7. Confidentiality',
        content: `7.1 The Contractor acknowledges that in the course of providing Services, they may have access to Confidential Information belonging to the Principal and its participants.

7.2 "Confidential Information" includes but is not limited to:
  (a) Personal information of NDIS participants
  (b) Health and medical information
  (c) NDIS plans and funding details
  (d) ${COMPANY}'s business operations, systems, and processes
  (e) Financial information
  (f) Any information marked as confidential

7.3 The Contractor must:
  (a) Keep all Confidential Information strictly confidential
  (b) Not disclose Confidential Information to any third party without prior written consent
  (c) Use Confidential Information only for the purpose of providing the Services
  (d) Return or destroy all Confidential Information upon termination of this Agreement

7.4 The obligations of confidentiality survive the termination of this Agreement.`,
      },
      {
        title: '8. Termination',
        content: `8.1 Either party may terminate this Agreement by providing 14 days' written notice to the other party.

8.2 The Principal may terminate this Agreement immediately if the Contractor:
  (a) Breaches any material term of this Agreement
  (b) Engages in misconduct or negligence
  (c) Fails to maintain required clearances or insurance
  (d) Breaches the NDIS Code of Conduct
  (e) Acts in a manner that puts participants at risk

8.3 Upon termination:
  (a) The Contractor must return all property of the Principal
  (b) The Contractor must complete and submit all outstanding documentation
  (c) The Principal will pay for all Services properly rendered up to the date of termination
  (d) Confidentiality obligations continue to apply`,
      },
      {
        title: '9. Execution',
        content: `This Agreement is executed by the parties on the date set out below.

For and on behalf of ${COMPANY}:

  Name: ${DIRECTOR}
  Position: Director
  Signature: ____________________
  Date: ____________________

Contractor:

  Name: ____________________
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [
      { key: 'contractorName', label: 'Contractor Full Name', type: 'text', required: true },
      { key: 'contractorAbn', label: 'Contractor ABN/ACN', type: 'text', required: true },
      { key: 'contractorAddress', label: 'Contractor Address', type: 'text', required: true },
      { key: 'contractorEmail', label: 'Contractor Email', type: 'email', required: true },
      { key: 'contractorPhone', label: 'Contractor Phone', type: 'tel', required: true },
      { key: 'commencementDate', label: 'Commencement Date', type: 'date', required: true },
      { key: 'weekdayRate', label: 'Standard Weekday Rate ($/hr)', type: 'number', required: true },
      { key: 'eveningRate', label: 'Evening Rate ($/hr)', type: 'number', required: false },
      { key: 'saturdayRate', label: 'Saturday Rate ($/hr)', type: 'number', required: false },
      { key: 'sundayRate', label: 'Sunday Rate ($/hr)', type: 'number', required: false },
      { key: 'publicHolidayRate', label: 'Public Holiday Rate ($/hr)', type: 'number', required: false },
      { key: 'paymentFrequency', label: 'Payment Frequency', type: 'select', required: true, options: ['Fortnightly', 'Monthly'] },
      { key: 'travelAllowance', label: 'Travel Allowance ($/km)', type: 'number', required: false },
      { key: 'ndisScreeningNumber', label: 'NDIS Worker Screening Number', type: 'text', required: true },
      { key: 'wwccNumber', label: 'Working with Children Check Number', type: 'text', required: false },
      { key: 'firstAidExpiry', label: 'First Aid Certificate Expiry', type: 'date', required: true },
      { key: 'publicLiabilityInsurer', label: 'Public Liability Insurer', type: 'text', required: true },
      { key: 'publicLiabilityPolicy', label: 'Public Liability Policy Number', type: 'text', required: true },
      { key: 'professionalIndemnityInsurer', label: 'Professional Indemnity Insurer', type: 'text', required: false },
      { key: 'professionalIndemnityPolicy', label: 'Professional Indemnity Policy Number', type: 'text', required: false },
      { key: 'signatureDate', label: 'Date of Signing', type: 'date', required: true },
    ],
  },

  // ────────────────────────────────────────────
  // 4. Incident Management Policy
  // ────────────────────────────────────────────
  {
    id: 'incident-management-policy',
    title: 'Incident Management Policy',
    category: 'Policies & Procedures',
    version: '2.0',
    lastUpdated: '2025-09-15',
    description: 'Policy outlining the framework for identifying, reporting, investigating, and reviewing incidents within the organisation.',
    isFillable: false,
    sections: [
      {
        title: '1. Purpose',
        content: `This policy establishes the framework for incident management within ${COMPANY}. It ensures that all incidents are identified, reported, investigated, and resolved in a timely and effective manner to:

  - Protect the safety and wellbeing of NDIS participants
  - Meet the requirements of the NDIS Quality and Safeguards Commission
  - Comply with the National Disability Insurance Scheme Act 2013
  - Support continuous improvement in service delivery
  - Maintain the trust and confidence of participants and their families`,
      },
      {
        title: '2. Scope',
        content: `This policy applies to:
  - All employees, contractors, and volunteers of ${COMPANY}
  - All services delivered under NDIS funding arrangements
  - All locations where services are provided, including participant homes, community settings, and office premises
  - All incidents that occur during or in connection with service delivery`,
      },
      {
        title: '3. Definitions',
        content: `Incident: Any event that causes, or has the potential to cause, harm to a participant, worker, or other person, or that disrupts the delivery of services.

Reportable Incident: An incident that must be reported to the NDIS Quality and Safeguards Commission under the National Disability Insurance Scheme (Incident Management and Reportable Incidents) Rules 2018, including:
  - The death of a person with disability
  - Serious injury of a person with disability
  - Abuse or neglect of a person with disability
  - Unlawful sexual or physical contact with, or assault of, a person with disability
  - The use of a restrictive practice in relation to a person with disability (other than in accordance with a behaviour support plan)

Near Miss: An event that could have resulted in harm but did not.

Restrictive Practice: Any practice or intervention that has the effect of restricting the rights or freedom of movement of a person with disability.`,
      },
      {
        title: '4. Reportable Incidents',
        content: `The following incidents MUST be reported to the NDIS Quality and Safeguards Commission within 24 hours:

  (a) Death of a participant during or related to service delivery
  (b) Serious injury requiring medical treatment beyond first aid
  (c) Abuse or neglect of a participant, including:
      - Physical abuse
      - Sexual abuse
      - Emotional/psychological abuse
      - Financial abuse
      - Neglect
  (d) Unlawful sexual or physical contact or assault
  (e) Unauthorised use of restrictive practices

All other incidents must be reported internally within 24 hours and documented within 48 hours.`,
      },
      {
        title: '5. Roles and Responsibilities',
        content: `Director (${DIRECTOR}):
  - Overall responsibility for incident management
  - Final decision-making authority on incident responses
  - Reporting to the NDIS Quality and Safeguards Commission
  - Ensuring adequate resources for incident management

All Staff and Contractors:
  - Immediately respond to ensure the safety of all parties
  - Report all incidents as soon as practicable
  - Complete incident report forms accurately and thoroughly
  - Cooperate with investigations
  - Participate in debriefing and review processes

Office Manager:
  - Maintain the incident register
  - Track follow-up actions
  - Coordinate investigations
  - Prepare reports for management review`,
      },
      {
        title: '6. Reporting Procedures',
        content: `Step 1: Immediate Response
  - Ensure the safety of the participant and all persons involved
  - Administer first aid if required
  - Call emergency services if necessary (000)

Step 2: Initial Notification (within 1 hour)
  - Contact ${COMPANY} management by phone: ${PHONE}
  - Provide a verbal summary of the incident

Step 3: Written Report (within 24 hours)
  - Complete the Incident Report Form
  - Include all relevant details, facts, and witness statements
  - Submit to the Director for review

Step 4: External Reporting (if required)
  - Reportable incidents: Director to notify the NDIS Commission within 24 hours
  - Police notification: as required by law
  - Family/guardian notification: as appropriate

Step 5: Follow-Up
  - Implement corrective actions
  - Review and update risk assessments
  - Provide support to affected parties`,
      },
      {
        title: '7. Investigation',
        content: `All incidents rated as Medium, High, or Critical will be investigated. The investigation will:

  7.1 Be initiated within 48 hours of the incident being reported
  7.2 Be conducted by an appropriate person not directly involved in the incident
  7.3 Include:
      (a) Review of the incident report and supporting documentation
      (b) Interviews with persons involved and witnesses
      (c) Review of relevant policies, procedures, and risk assessments
      (d) Identification of root causes and contributing factors
      (e) Recommendations for corrective and preventive actions

  7.4 An investigation report will be completed within 14 days
  7.5 Findings and recommendations will be reviewed by the Director
  7.6 A five-day investigation report must be submitted to the NDIS Commission for reportable incidents`,
      },
      {
        title: '8. Review',
        content: `8.1 All incident reports and investigation findings will be reviewed quarterly by the Director.

8.2 The review will include:
  (a) Analysis of incident trends and patterns
  (b) Effectiveness of corrective actions
  (c) Identification of systemic issues
  (d) Updates to policies, procedures, and risk assessments as needed

8.3 This policy will be reviewed annually or following a significant incident, whichever occurs first.

8.4 Last Review Date: ${new Date().toLocaleDateString('en-AU')}
    Next Review Date: ____________________

Approved by:
  Name: ${DIRECTOR}
  Position: Director, ${COMPANY}
  Date: ____________________`,
      },
    ],
    fields: [],
  },

  // ────────────────────────────────────────────
  // 5. Master Services Agreement
  // ────────────────────────────────────────────
  {
    id: 'master-services-agreement',
    title: 'Master Services Agreement',
    category: 'Agreements & Contracts',
    version: '2.2',
    lastUpdated: '2025-11-01',
    description: 'Service agreement between Thrive 4 Better and NDIS participants/nominees outlining services, fees, rights, and responsibilities.',
    isFillable: true,
    sections: [
      {
        title: '1. Provider Details',
        content: `Provider: ${COMPANY}
ABN: ${ABN}
Director: ${DIRECTOR}
Address: ${LOCATION}
Phone: ${PHONE}
Email: ${EMAIL}

NDIS Registration Number: [Registration Number]`,
      },
      {
        title: '2. Client Details',
        content: `Participant Name: ____________________
NDIS Number: ____________________
Date of Birth: ____________________
Address: ____________________
Phone: ____________________
Email: ____________________

Nominee/Guardian (if applicable):
  Name: ____________________
  Relationship: ____________________
  Phone: ____________________
  Email: ____________________

Plan Manager (if applicable):
  Name: ____________________
  Organisation: ____________________
  Email: ____________________`,
      },
      {
        title: '3. Services',
        content: `3.1 ${COMPANY} agrees to provide the following NDIS-funded support services to the Participant:

  Service Type: ____________________
  NDIS Support Category: ____________________
  Estimated Hours per Week: ____________________
  Preferred Days/Times: ____________________
  Location of Service Delivery: ____________________

3.2 Additional services may be agreed upon in writing between the parties.

3.3 Services will be delivered in accordance with:
  (a) The Participant's NDIS Plan
  (b) The Participant's Support Plan (developed collaboratively)
  (c) ${COMPANY}'s policies and procedures
  (d) NDIS Practice Standards and Quality Indicators

3.4 ${COMPANY} will endeavour to provide consistent support workers but cannot guarantee the same worker at all times.`,
      },
      {
        title: '4. Term',
        content: `4.1 This Agreement commences on ________________ and continues until:
  (a) The Participant's current NDIS Plan ends on ________________; or
  (b) Either party terminates this Agreement in accordance with Clause 8; or
  (c) The Agreement is replaced by a new agreement

whichever occurs first.

4.2 This Agreement may be renewed or extended by mutual written agreement.`,
      },
      {
        title: '5. Fees and Payment',
        content: `5.1 Fees for services will be charged in accordance with the NDIS Pricing Arrangements and Price Limits current at the time services are delivered.

5.2 The Participant's funding type is: Agency Managed / Plan Managed / Self Managed (circle one)

5.3 For Agency Managed participants:
  - ${COMPANY} will claim directly from the NDIA
  - Claims will be made within 7 days of service delivery

5.4 For Plan Managed participants:
  - Invoices will be sent to the nominated Plan Manager
  - Payment terms: 14 days from invoice date

5.5 For Self Managed participants:
  - Invoices will be sent to the Participant/Nominee
  - Payment terms: 14 days from invoice date

5.6 Cancellation Policy:
  - Short Notice Cancellation: Less than 2 clear business days' notice
  - ${COMPANY} may charge 100% of the agreed fee for short notice cancellations in accordance with NDIS guidelines
  - No Show: ${COMPANY} may charge 100% of the agreed fee`,
      },
      {
        title: '6. Confidentiality and Privacy',
        content: `6.1 ${COMPANY} will collect, use, and store the Participant's personal information in accordance with:
  (a) The Privacy Act 1988 (Cth) and Australian Privacy Principles
  (b) The NDIS Act 2013
  (c) ${COMPANY}'s Privacy Policy

6.2 Personal information will only be shared:
  (a) With the Participant's consent
  (b) As required by law
  (c) To the extent necessary for service delivery
  (d) With other providers involved in the Participant's care (with consent)

6.3 The Participant has the right to:
  (a) Access their personal information held by ${COMPANY}
  (b) Request correction of inaccurate information
  (c) Withdraw consent for information sharing (noting this may affect service delivery)`,
      },
      {
        title: '7. Intellectual Property and Records',
        content: `7.1 ${COMPANY} retains ownership of all templates, systems, processes, and materials developed by ${COMPANY}.

7.2 The Participant retains ownership of their personal information and care-related documentation.

7.3 ${COMPANY} will maintain records of all services delivered for a minimum of 7 years in accordance with legal requirements.

7.4 The Participant may request copies of their records at any time.`,
      },
      {
        title: '8. Liability and Insurance',
        content: `8.1 ${COMPANY} maintains the following insurance:
  (a) Public Liability: $20,000,000
  (b) Professional Indemnity: $10,000,000
  (c) Workers Compensation (as required by law)

8.2 ${COMPANY}'s liability is limited to the extent permitted by law and in accordance with NDIS requirements.

8.3 ${COMPANY} is not liable for:
  (a) Loss or damage caused by the Participant's own actions
  (b) Loss or damage caused by third parties not under ${COMPANY}'s control
  (c) Indirect or consequential losses`,
      },
      {
        title: '9. Termination',
        content: `9.1 Either party may terminate this Agreement by providing 14 days' written notice.

9.2 ${COMPANY} may terminate immediately if:
  (a) Continuation of services poses an unacceptable risk to the Participant or staff
  (b) The Participant's NDIS funding is exhausted or withdrawn
  (c) There is a serious breach of this Agreement

9.3 Upon termination, ${COMPANY} will:
  (a) Provide reasonable assistance to transition to another provider
  (b) Provide copies of all relevant documentation
  (c) Invoice for any services delivered up to the termination date`,
      },
      {
        title: '10. Execution',
        content: `By signing below, the parties agree to the terms and conditions of this Agreement.

For ${COMPANY}:
  Name: ${DIRECTOR}
  Position: Director
  Signature: ____________________
  Date: ____________________

Participant/Nominee:
  Name: ____________________
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [
      { key: 'participantName', label: 'Participant Name', type: 'text', required: true },
      { key: 'participantNdis', label: 'NDIS Number', type: 'text', required: true },
      { key: 'participantDob', label: 'Date of Birth', type: 'date', required: true },
      { key: 'participantAddress', label: 'Address', type: 'text', required: true },
      { key: 'participantPhone', label: 'Phone', type: 'tel', required: true },
      { key: 'participantEmail', label: 'Email', type: 'email', required: false },
      { key: 'nomineeName', label: 'Nominee/Guardian Name', type: 'text', required: false },
      { key: 'nomineeRelationship', label: 'Nominee Relationship', type: 'text', required: false },
      { key: 'nomineePhone', label: 'Nominee Phone', type: 'tel', required: false },
      { key: 'nomineeEmail', label: 'Nominee Email', type: 'email', required: false },
      { key: 'planManagerName', label: 'Plan Manager Name', type: 'text', required: false },
      { key: 'planManagerOrg', label: 'Plan Manager Organisation', type: 'text', required: false },
      { key: 'planManagerEmail', label: 'Plan Manager Email', type: 'email', required: false },
      { key: 'serviceType', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g. Daily Living, Community Access' },
      { key: 'supportCategory', label: 'NDIS Support Category', type: 'text', required: true },
      { key: 'estimatedHours', label: 'Estimated Hours per Week', type: 'number', required: true },
      { key: 'preferredSchedule', label: 'Preferred Days/Times', type: 'text', required: false },
      { key: 'serviceLocation', label: 'Location of Service Delivery', type: 'text', required: true },
      { key: 'fundingType', label: 'Funding Type', type: 'select', required: true, options: ['Agency Managed', 'Plan Managed', 'Self Managed'] },
      { key: 'commencementDate', label: 'Commencement Date', type: 'date', required: true },
      { key: 'planEndDate', label: 'NDIS Plan End Date', type: 'date', required: true },
      { key: 'signatureDate', label: 'Date of Signing', type: 'date', required: true },
    ],
  },

  // ────────────────────────────────────────────
  // 6. OHS Documentation Pack
  // ────────────────────────────────────────────
  {
    id: 'ohs-documentation',
    title: 'OHS Documentation Pack',
    category: 'Policies & Procedures',
    version: '1.3',
    lastUpdated: '2025-10-01',
    description: 'Comprehensive occupational health and safety documentation including policy, hazard identification, risk assessment, SWMS, PPE checklist, and emergency procedures.',
    isFillable: false,
    sections: [
      {
        title: '1. OHS Policy Statement',
        content: `${COMPANY} is committed to providing a safe and healthy working environment for all employees, contractors, participants, and visitors.

We recognise that the health and safety of our workers and participants is paramount to the success of our organisation and the quality of care we provide.

Our Commitments:
  - Comply with all applicable occupational health and safety legislation, including the Occupational Health and Safety Act 2004 (Vic) and associated regulations
  - Provide and maintain safe work environments, systems, and equipment
  - Ensure adequate training, instruction, and supervision for all workers
  - Consult with workers on health and safety matters
  - Continuously improve our health and safety performance
  - Provide resources necessary to implement this policy
  - Respond promptly to health and safety concerns

This policy applies to all work conducted by or on behalf of ${COMPANY}, including services delivered in participant homes and community settings.

Signed: ${DIRECTOR}
Position: Director
Date: ____________________`,
      },
      {
        title: '2. Hazard Identification Checklist',
        content: `Use this checklist when assessing new participant homes or service locations.

Physical Hazards:
  [ ] Uneven or slippery flooring
  [ ] Inadequate lighting
  [ ] Stairs without handrails
  [ ] Trip hazards (cords, rugs, clutter)
  [ ] Heavy lifting requirements
  [ ] Extreme temperatures
  [ ] Unsafe electrical equipment
  [ ] Sharp objects or edges

Biological Hazards:
  [ ] Infectious diseases
  [ ] Body fluid exposure risk
  [ ] Pest infestations
  [ ] Mould or dampness
  [ ] Animal hazards (pets)

Chemical Hazards:
  [ ] Cleaning products stored unsafely
  [ ] Chemical fumes or odours
  [ ] Hazardous materials present

Psychosocial Hazards:
  [ ] Risk of aggressive behaviour
  [ ] Verbal abuse risk
  [ ] Isolated work location
  [ ] High-stress environment
  [ ] Domestic violence concerns

Ergonomic Hazards:
  [ ] Repetitive manual handling
  [ ] Awkward postures required
  [ ] Inadequate equipment for transfers
  [ ] Prolonged standing/sitting

Assessed by: ____________________
Date: ____________________
Location: ____________________`,
      },
      {
        title: '3. Risk Assessment Matrix',
        content: `Risk Rating = Likelihood x Consequence

Likelihood:
  1 - Rare: May occur only in exceptional circumstances
  2 - Unlikely: Could occur but not expected
  3 - Possible: Might occur at some time
  4 - Likely: Will probably occur in most circumstances
  5 - Almost Certain: Expected to occur in most circumstances

Consequence:
  1 - Insignificant: No injury, low financial loss
  2 - Minor: First aid treatment, medium financial loss
  3 - Moderate: Medical treatment, high financial loss
  4 - Major: Extensive injuries, major financial loss
  5 - Catastrophic: Death, huge financial loss

Risk Rating:
  1-4: Low Risk - Manage by routine procedures
  5-9: Medium Risk - Specific risk management procedures required
  10-15: High Risk - Senior management attention needed
  16-25: Extreme Risk - Immediate action required

Risk Register:
  Hazard | Likelihood | Consequence | Risk Rating | Controls | Responsible | Review Date
  ________|___________|_____________|_____________|__________|_____________|____________
  ________|___________|_____________|_____________|__________|_____________|____________
  ________|___________|_____________|_____________|__________|_____________|____________`,
      },
      {
        title: '4. Safe Work Method Statement (SWMS) - Home Support Services',
        content: `Activity: Providing in-home disability support services
Location: Participant homes and community settings
Prepared by: ${DIRECTOR}
Date: ____________________

Step 1: Pre-Service Preparation
  Hazards: Insufficient information about participant/location
  Controls:
    - Review participant care plan before visit
    - Check for known hazards or risks
    - Confirm appointment details
    - Ensure phone is charged and emergency contacts are accessible

Step 2: Travel to Location
  Hazards: Road safety, fatigue, weather
  Controls:
    - Follow road rules and safe driving practices
    - Allow adequate travel time
    - Report vehicle issues immediately
    - Do not drive while fatigued

Step 3: Arrival and Entry
  Hazards: Unsafe entry, animals, environmental hazards
  Controls:
    - Assess entry for safety
    - Confirm pet management
    - Check for obvious hazards upon entry
    - Conduct visual safety check of work area

Step 4: Service Delivery
  Hazards: Manual handling, biological exposure, behaviour
  Controls:
    - Use correct manual handling techniques
    - Wear appropriate PPE
    - Follow behaviour support plans
    - Maintain awareness of exits
    - Use two-person approach for high-risk tasks

Step 5: Completion and Departure
  Hazards: Incomplete handover, documentation gaps
  Controls:
    - Complete shift notes
    - Report any incidents or concerns
    - Secure participant's home
    - Confirm next visit details`,
      },
      {
        title: '5. PPE Checklist',
        content: `Personal Protective Equipment Requirements

Standard PPE Kit (all support workers):
  [ ] Disposable gloves (multiple pairs)
  [ ] Hand sanitiser
  [ ] Face masks (surgical)
  [ ] Apron/gown (disposable)
  [ ] Anti-bacterial wipes

Additional PPE (as required):
  [ ] N95/P2 respirator masks
  [ ] Face shield/goggles
  [ ] Waterproof gown
  [ ] Shoe covers
  [ ] Non-slip footwear

PPE Usage Guidelines:
  - Don PPE before commencing personal care tasks
  - Change gloves between tasks and between participants
  - Remove PPE in the correct order to prevent contamination
  - Dispose of single-use PPE in appropriate waste bins
  - Wash hands before and after PPE use
  - Report any PPE shortages to management immediately

PPE Stock Check:
  Worker Name: ____________________
  Date: ____________________
  All items present and in good condition: Yes / No
  Items needing replacement: ____________________`,
      },
      {
        title: '6. Incident & Hazard Report Form',
        content: `(Refer to separate Incident Report Form for detailed incident reporting)

Quick Hazard Report:
  Date: ____________________
  Location: ____________________
  Reported by: ____________________

  Hazard Description:
  ____________________
  ____________________

  Risk Level: Low / Medium / High / Extreme

  Suggested Controls:
  ____________________
  ____________________

  Action Taken:
  ____________________

  Reported to Management: Yes / No
  Date Resolved: ____________________`,
      },
      {
        title: '7. Workplace Inspection Checklist',
        content: `Office/Workspace Inspection (quarterly)

General:
  [ ] Emergency exits clear and accessible
  [ ] Emergency equipment (fire extinguisher, first aid kit) present and current
  [ ] Lighting adequate in all areas
  [ ] Flooring in good condition, no trip hazards
  [ ] Temperature and ventilation comfortable
  [ ] Electrical equipment tested and tagged (current)

Ergonomics:
  [ ] Workstations set up correctly
  [ ] Adjustable chairs available
  [ ] Screen height and distance appropriate
  [ ] Keyboard and mouse positioning correct

Kitchen/Break Area:
  [ ] Clean and hygienic
  [ ] Appliances in good working order
  [ ] Food stored correctly
  [ ] Waste bins emptied regularly

Bathroom/Amenities:
  [ ] Clean and hygienic
  [ ] Soap, paper towels, and toilet supplies stocked
  [ ] Plumbing in good working order

Inspector: ____________________
Date: ____________________
Signature: ____________________
Next inspection due: ____________________`,
      },
      {
        title: '8. Emergency Procedures',
        content: `Emergency Contact Numbers:
  Emergency Services: 000
  Poison Information Centre: 13 11 26
  ${COMPANY}: ${PHONE}
  ${DIRECTOR} (Director): ${PHONE}

Fire:
  1. Alert everyone in the area - shout "FIRE"
  2. Call 000
  3. If safe to do so, use a fire extinguisher
  4. Evacuate the building using the nearest safe exit
  5. Assist the participant to evacuate safely
  6. Assemble at the designated meeting point
  7. Do not re-enter until cleared by emergency services
  8. Notify ${COMPANY} management

Medical Emergency:
  1. Call 000 if life-threatening
  2. Administer first aid within your training
  3. Stay with the person until help arrives
  4. Do not move the person unless necessary for safety
  5. Provide clear information to emergency services
  6. Complete an Incident Report Form
  7. Notify ${COMPANY} management immediately

Natural Disaster:
  1. Follow direction from emergency services
  2. Ensure participant safety is the priority
  3. Move to a safe location
  4. Contact ${COMPANY} management when safe to do so
  5. Complete documentation once the situation is resolved

Personal Safety Threat:
  1. Remove yourself from danger if possible
  2. Call 000 if in immediate danger
  3. Do not engage with an aggressive person
  4. Use de-escalation techniques if trained
  5. Leave the premises if necessary
  6. Contact ${COMPANY} management
  7. Complete an Incident Report Form`,
      },
    ],
    fields: [],
  },

  // ────────────────────────────────────────────
  // 7. Confidentiality Agreement
  // ────────────────────────────────────────────
  {
    id: 'confidentiality-agreement',
    title: 'Confidentiality Agreement',
    category: 'Agreements & Contracts',
    version: '1.5',
    lastUpdated: '2025-10-15',
    description: 'Agreement binding employees and contractors to maintain confidentiality of all participant and business information.',
    isFillable: true,
    sections: [
      {
        title: '1. Parties',
        content: `This Confidentiality Agreement ("Agreement") is entered into between:

Disclosing Party:
  ${COMPANY}
  ABN: ${ABN}
  Address: ${LOCATION}
  ("the Company")

Receiving Party:
  Name: ____________________
  Position/Role: ____________________
  Address: ____________________
  ("the Recipient")`,
      },
      {
        title: '2. Definition of Confidential Information',
        content: `2.1 "Confidential Information" means all information, whether written, oral, electronic, or in any other form, that is:
  (a) Disclosed by or on behalf of the Company to the Recipient; or
  (b) Obtained by the Recipient in the course of their engagement with the Company

2.2 Confidential Information includes but is not limited to:
  (a) Personal information of NDIS participants, including:
      - Names, addresses, and contact details
      - Health and medical information
      - NDIS numbers and plan details
      - Support plans and care documentation
      - Assessment reports and progress notes
      - Photographs and recordings
  (b) Personal information of employees and contractors
  (c) Business information, including:
      - Financial records and projections
      - Client lists and referral sources
      - Business plans and strategies
      - Pricing and fee structures
      - Policies, procedures, and systems
      - Marketing materials and plans
  (d) Intellectual property, including:
      - Software and technology systems
      - Templates and documentation
      - Training materials
      - Processes and methodologies`,
      },
      {
        title: '3. Obligations of the Recipient',
        content: `3.1 The Recipient agrees to:
  (a) Keep all Confidential Information strictly confidential
  (b) Not disclose, publish, or communicate Confidential Information to any person without the prior written consent of the Company
  (c) Use Confidential Information only for the purpose of fulfilling their role with the Company
  (d) Take all reasonable steps to prevent unauthorised access to Confidential Information
  (e) Not copy, reproduce, or store Confidential Information except as necessary for their role
  (f) Comply with the Privacy Act 1988 (Cth) and Australian Privacy Principles
  (g) Comply with ${COMPANY}'s Privacy Policy and information security procedures
  (h) Report any suspected or actual breach of confidentiality immediately to the Company

3.2 The Recipient must not:
  (a) Discuss participant information in public places
  (b) Share participant information on social media or messaging platforms
  (c) Access information systems or records without authorisation
  (d) Remove documents or data from the workplace without authorisation
  (e) Use personal devices to store Confidential Information without approval`,
      },
      {
        title: '4. Exceptions',
        content: `4.1 The obligations in this Agreement do not apply to information that:
  (a) Is or becomes publicly available through no fault of the Recipient
  (b) Was already known to the Recipient before disclosure by the Company (as evidenced by written records)
  (c) Is independently developed by the Recipient without reference to Confidential Information
  (d) Is required to be disclosed by law, regulation, or court order, provided the Recipient:
      - Notifies the Company before disclosure (where permitted by law)
      - Discloses only the minimum information required
      - Cooperates with the Company to seek a protective order

4.2 The Recipient may disclose Confidential Information to the extent necessary for:
  (a) Mandatory reporting obligations (e.g., child protection, reportable incidents)
  (b) Emergency situations where disclosure is necessary to prevent serious harm
  (c) Legal proceedings as required by law`,
      },
      {
        title: '5. Return of Information',
        content: `5.1 Upon termination of the Recipient's engagement with the Company, or upon request by the Company, the Recipient must:
  (a) Immediately return all documents, materials, and records containing Confidential Information
  (b) Delete all electronic copies of Confidential Information from personal devices
  (c) Return all Company property, including keys, access cards, and equipment
  (d) Certify in writing that all Confidential Information has been returned or destroyed

5.2 The Company may request the return of specific Confidential Information at any time during the Recipient's engagement.`,
      },
      {
        title: '6. Remedies',
        content: `6.1 The Recipient acknowledges that a breach of this Agreement may cause irreparable harm to the Company and its participants.

6.2 In the event of a breach or threatened breach, the Company may:
  (a) Seek injunctive relief to prevent further disclosure
  (b) Claim damages, including consequential and special damages
  (c) Report the breach to relevant authorities, including the NDIS Quality and Safeguards Commission, the Office of the Australian Information Commissioner, or law enforcement
  (d) Terminate the Recipient's engagement immediately

6.3 The Recipient may also be subject to:
  (a) Penalties under the Privacy Act 1988
  (b) Sanctions under the NDIS Act 2013
  (c) Criminal prosecution where applicable`,
      },
      {
        title: '7. Term',
        content: `7.1 This Agreement commences on the date of execution and continues for the duration of the Recipient's engagement with the Company.

7.2 The obligations of confidentiality survive the termination of this Agreement and the Recipient's engagement with the Company indefinitely, unless the information becomes publicly available through no fault of the Recipient.

7.3 The Recipient acknowledges that they will continue to be bound by this Agreement after their engagement ends.`,
      },
      {
        title: '8. Execution',
        content: `I, the Recipient, have read and understood this Confidentiality Agreement. I agree to be bound by its terms and conditions.

Recipient:
  Name: ____________________
  Position: ____________________
  Signature: ____________________
  Date: ____________________

For ${COMPANY}:
  Name: ${DIRECTOR}
  Position: Director
  Signature: ____________________
  Date: ____________________

Witness:
  Name: ____________________
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [
      { key: 'recipientName', label: 'Recipient Full Name', type: 'text', required: true },
      { key: 'recipientPosition', label: 'Position/Role', type: 'text', required: true },
      { key: 'recipientAddress', label: 'Address', type: 'text', required: true },
      { key: 'recipientEmail', label: 'Email', type: 'email', required: false },
      { key: 'recipientPhone', label: 'Phone', type: 'tel', required: false },
      { key: 'commencementDate', label: 'Commencement Date', type: 'date', required: true },
      { key: 'witnessName', label: 'Witness Name', type: 'text', required: false },
      { key: 'signatureDate', label: 'Date of Signing', type: 'date', required: true },
    ],
  },

  // ────────────────────────────────────────────
  // 8. Media Release Agreement
  // ────────────────────────────────────────────
  {
    id: 'media-release-agreement',
    title: 'Media Release Agreement',
    category: 'Agreements & Contracts',
    version: '1.2',
    lastUpdated: '2025-09-01',
    description: 'Consent form for participants/guardians to authorise use of photos, videos, and testimonials for marketing and promotional purposes.',
    isFillable: true,
    sections: [
      {
        title: '1. Participant/Guardian Details',
        content: `This Media Release Agreement ("Agreement") is between:

${COMPANY}
ABN: ${ABN}
Address: ${LOCATION}

And the Participant/Guardian:
  Participant Name: ____________________
  NDIS Number: ____________________
  Date of Birth: ____________________

  Guardian/Nominee (if applicable):
    Name: ____________________
    Relationship: ____________________
    Phone: ____________________
    Email: ____________________`,
      },
      {
        title: '2. Scope of Consent',
        content: `By signing this Agreement, the Participant/Guardian consents to ${COMPANY} capturing and using the following media:

  [ ] Photographs
  [ ] Video recordings
  [ ] Audio recordings
  [ ] Written testimonials or quotes
  [ ] Artwork or creative works produced during activities

The media may be captured during:
  [ ] Support sessions and activities
  [ ] Community outings and events
  [ ] Social and recreational activities
  [ ] Celebrations and milestones
  [ ] Other (specify): ____________________`,
      },
      {
        title: '3. Permitted Uses',
        content: `The Participant/Guardian consents to the media being used for the following purposes:

  [ ] ${COMPANY} website (www.thrive4better.com)
  [ ] Social media accounts (Facebook, Instagram, LinkedIn)
  [ ] Marketing brochures and printed materials
  [ ] Newsletters and email communications
  [ ] Presentations and training materials
  [ ] Reports and publications
  [ ] Media releases and press

The Participant/Guardian does NOT consent to the following (tick if applicable):
  [ ] Use of full name in publications
  [ ] Use on social media
  [ ] Use in external media (newspapers, TV)
  [ ] Use in presentations to external parties
  [ ] Other restrictions: ____________________

${COMPANY} agrees to:
  - Use media in a respectful and dignified manner
  - Not use media in any way that could bring the Participant into disrepute
  - Not sell or provide media to third parties without additional consent
  - Remove or cease using media upon request`,
      },
      {
        title: '4. Withdrawal of Consent',
        content: `4.1 The Participant/Guardian may withdraw consent at any time by providing written notice to ${COMPANY}.

4.2 Upon receiving notice of withdrawal, ${COMPANY} will:
  (a) Cease using the media in future publications and materials within 14 days
  (b) Remove digital media from websites and social media within 14 days
  (c) Make reasonable efforts to retrieve or cease distribution of printed materials

4.3 The Participant/Guardian acknowledges that:
  (a) It may not be possible to recall all copies of printed materials already distributed
  (b) Content shared by third parties (e.g., media shared on social media) may not be fully removable
  (c) Withdrawal of consent does not affect media used prior to the withdrawal

Written withdrawal should be sent to:
  ${COMPANY}
  Email: ${EMAIL}
  Phone: ${PHONE}`,
      },
      {
        title: '5. Privacy Obligations',
        content: `5.1 ${COMPANY} will handle all media and personal information in accordance with:
  (a) The Privacy Act 1988 (Cth) and Australian Privacy Principles
  (b) The NDIS Act 2013
  (c) ${COMPANY}'s Privacy Policy

5.2 Media will be stored securely and access will be limited to authorised personnel only.

5.3 ${COMPANY} will not disclose the Participant's disability status, health information, or NDIS details in connection with any published media unless expressly agreed.

5.4 The Participant/Guardian has the right to:
  (a) View any media before it is published (upon request)
  (b) Request that specific media not be used
  (c) Request copies of media captured of the Participant`,
      },
      {
        title: '6. Execution',
        content: `I have read and understood this Media Release Agreement. I consent to the capture and use of media as outlined above.

Participant (if able to consent):
  Name: ____________________
  Signature: ____________________
  Date: ____________________

Guardian/Nominee (if applicable):
  Name: ____________________
  Relationship: ____________________
  Signature: ____________________
  Date: ____________________

For ${COMPANY}:
  Name: ${DIRECTOR}
  Position: Director
  Signature: ____________________
  Date: ____________________`,
      },
    ],
    fields: [
      { key: 'participantName', label: 'Participant Name', type: 'text', required: true },
      { key: 'participantNdis', label: 'NDIS Number', type: 'text', required: false },
      { key: 'participantDob', label: 'Date of Birth', type: 'date', required: false },
      { key: 'guardianName', label: 'Guardian/Nominee Name', type: 'text', required: false },
      { key: 'guardianRelationship', label: 'Guardian Relationship', type: 'text', required: false },
      { key: 'guardianPhone', label: 'Guardian Phone', type: 'tel', required: false },
      { key: 'guardianEmail', label: 'Guardian Email', type: 'email', required: false },
      { key: 'consentPhotos', label: 'Consent for Photographs', type: 'checkbox', required: false },
      { key: 'consentVideo', label: 'Consent for Video', type: 'checkbox', required: false },
      { key: 'consentAudio', label: 'Consent for Audio', type: 'checkbox', required: false },
      { key: 'consentTestimonials', label: 'Consent for Testimonials', type: 'checkbox', required: false },
      { key: 'consentArtwork', label: 'Consent for Artwork', type: 'checkbox', required: false },
      { key: 'useWebsite', label: 'Permitted: Website', type: 'checkbox', required: false },
      { key: 'useSocialMedia', label: 'Permitted: Social Media', type: 'checkbox', required: false },
      { key: 'useBrochures', label: 'Permitted: Brochures/Print', type: 'checkbox', required: false },
      { key: 'useNewsletters', label: 'Permitted: Newsletters', type: 'checkbox', required: false },
      { key: 'usePresentations', label: 'Permitted: Presentations', type: 'checkbox', required: false },
      { key: 'restrictions', label: 'Additional Restrictions', type: 'textarea', required: false },
      { key: 'signatureDate', label: 'Date of Signing', type: 'date', required: true },
    ],
  },
];

// Helper to get documents by category
export function getDocumentsByCategory(category: DocumentCategory): CompanyDocument[] {
  return companyDocuments.filter((d) => d.category === category);
}

// Helper to get a document by ID
export function getDocumentById(id: string): CompanyDocument | undefined {
  return companyDocuments.find((d) => d.id === id);
}

// All document categories in display order
export const documentCategories: { label: DocumentCategory; description: string }[] = [
  { label: 'Policies & Procedures', description: 'Organisational policies and compliance documentation' },
  { label: 'Agreements & Contracts', description: 'Legal agreements for contractors, clients, and staff' },
  { label: 'Templates', description: 'Fillable templates for support plans and incident reports' },
];

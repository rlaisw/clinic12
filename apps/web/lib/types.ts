export interface Medication {
    id?: string
    name: string
    generic_name?: string
    category?: string
    unit?: string
    strength?: number
    dosage_strength?: string
    administration_route?: string
    frequency?: string
    dosage_instructions?: Record<string, any>
    side_effects?: string
    contraindications?: string
    warnings?: string
    stock_value?: number
    min_stock_level?: number
    max_stock_level?: number
    threshold_stock_value?: number
    expiry_date?: string
    batch_number?: string
    manufacturing_date?: string
    supplier_name?: string
    supplier_contact?: string
    supplier_email?: string
    supplier_phone?: string
    supplier_address?: string
    unit_cost?: number
    total_value?: number
    is_active?: boolean
    requires_refrigeration?: boolean
    created_at?: string
    updated_at?: string
    last_stock_update?: string
}

export type CreateMedicationInput = Partial<Medication>;

export type UpdateMedicationInput = Partial<CreateMedicationInput>;

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "M" | "F";
  phone: string;
  email?: string | null;
  address?: string;
  blood_type?: string;
  allergies?: string;
  hkid?: string;
  emergency_contacts: EmergencyContact[];
  medical_history: MedicalHistory[];
}

// Convert to/from API format
export type PatientId = string;

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalHistory {
  id: string;
  condition: string;
  diagnosis_date: string;
  notes?: string;
}

export type CreatePatientInput = Partial<Patient>;

export type UpdatePatientInput = Partial<CreatePatientInput>;

export interface PatientBackground {
  id: string;
  patient: string;
  chief_complaint?: string;
  past_medical_history?: {
    illnesses?: string;
    surgeries?: string;
    injuries?: string;
    hospitalizations?: string;
  };
  social_family_history?: {
    smoking?: "never" | "former" | "current";
    alcohol?: "never" | "former" | "current";
    family_diseases?: string;
  };
  occupation?: string;
}

export type CreatePatientBackgroundInput = Partial<PatientBackground>;

export type UpdatePatientBackgroundInput = Partial<CreatePatientBackgroundInput>;

export interface ActiveMedication {
  id: string;
  patient: string;
  item: number;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  days_supply?: number;
  diagnostic_result?: string;
  start_date: string;
}

export type CreateActiveMedicationInput = Partial<ActiveMedication>;

export type UpdateActiveMedicationInput = Partial<CreateActiveMedicationInput>;

export interface PastMedication {
  id: string;
  patient: string;
  item: number;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  days_supply?: number;
  diagnostic_result?: string;
  start_date: string;
  end_date: string;
  reason_discontinuation?: string;
}

export type CreatePastMedicationInput = Partial<PastMedication>;

export type UpdatePastMedicationInput = Partial<CreatePastMedicationInput>;

export interface Allergy {
  id: string;
  patient: string;
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
}

export type CreateAllergyInput = Partial<Allergy>;

export type UpdateAllergyInput = Partial<CreateAllergyInput>;

export interface PrescriptionMedication {
  id: string;
  patient: string;
  item: number;
  medication_name: string;
  dosage_amount: number;
  dosage_unit: string;
  route: string;
  frequency: string;
  days_supply?: number;
  diagnostic_result?: string;
  start_date?: string;
  end_date?: string;
}

export type CreatePrescriptionMedicationInput = Partial<PrescriptionMedication>;

export type UpdatePrescriptionMedicationInput = Partial<CreatePrescriptionMedicationInput>;

// ============================================================
// Queue / Patient Queue Types
// ============================================================

export type QueueStatus = "waiting" | "in_consultation" | "completed";

export type VisitType = "follow_up" | "walkin" | "appointment" | "emergency";

export interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  initials: string;
  visit_type: VisitType;
  reason: string;
  status: QueueStatus;
  check_in_time: string;
  doctor_name?: string | null;
  room_name?: string | null;
  wait_time_minutes?: number;
  consultation_start_time?: string | null;
  completed_at?: string | null;
}

export interface QueueStats {
  waiting: number;
  in_consultation: number;
  in_clinic: number;
  next_up: QueueEntry | null;
  avg_wait_time: number; // minutes
}

export interface QueueCheckInInput {
  patient_id: string;
  patient_name: string;
  visit_type: VisitType;
  reason?: string;
}

// ============================================================
// Sick Leave Certificate Types
// ============================================================

export interface SickLeaveCertificate {
  id: string;
  reference_number: string;
  patient: string;
  doctor_name: string;
  doctor_email: string;
  doctor_phone: string;
  clinic_name: string;
  clinic_address: string;
  patient_name: string;
  patient_hkid: string;
  consultation_details: string;
  diagnosis: string;
  recommended_sick_leave: string;
  remarks: string;
  issue_date: string;
  expiry_date: string;
  qr_code_token: string;
  status: "active" | "revoked";
  signature_timestamp: string;
  revoked_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SickLeaveCertificateCreateResponse extends SickLeaveCertificate {
  qr_code_base64?: string;
}

export interface SickLeaveCertificateListItem {
  id: string;
  reference_number: string;
  patient_name: string;
  patient_hkid: string;
  issue_date: string;
  diagnosis: string;
  remarks: string;
  status: string;
  qr_code_token: string;
}

export interface CreateSickLeaveCertificateInput {
  consultation_details: string;
  diagnosis: string;
  recommended_sick_leave: string;
  remarks?: string;
}

export interface ShareLinkResponse {
  share_url: string;
  expires_at: string;
  max_views: number | null;
}

export interface CertificateVerificationResponse {
  verified: boolean;
  message: string;
  certificate?: {
    patient_name: string;
    doctor_name: string;
    clinic_name: string;
    issue_date: string;
    diagnosis: string;
  };
}

// ============================================================
// Receipt Types
// ============================================================

export interface Receipt {
  id: string;
  rref: string;
  patient: string;
  doctor_name: string;
  doctor_display_name: string;
  doctor_email: string;
  doctor_phone: string;
  clinic_name: string;
  clinic_address: string;
  patient_name: string;
  patient_hkid: string;
  date: string;
  consultation: string;
  medications: string;
  investigations: string;
  procedures: string;
  misc: string;
  consultation_free: string;
  medications_free: string;
  investigations_free: string;
  procedures_free: string;
  misc_free: string;
  total_free: string;
  total_dollars: string;
  diagnosis: string;
  qr_code_token: string;
  status: "active" | "revoked";
  signature_timestamp: string;
  revoked_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptCreateResponse extends Receipt {
  qr_code_base64?: string;
}

export interface ReceiptListItem {
  id: string;
  rref: string;
  patient_name: string;
  patient_hkid: string;
  date: string;
  diagnosis: string;
  total_free: string;
  status: string;
  qr_code_token: string;
}

export interface CreateReceiptInput {
  consultation: string;
  medications?: string;
  investigations?: string;
  procedures?: string;
  misc?: string;
  consultation_free?: number;
  medications_free?: number;
  investigations_free?: number;
  procedures_free?: number;
  misc_free?: number;
  total_free: number;
  diagnosis: string;
}

export interface ReceiptVerificationResponse {
  verified: boolean;
  message: string;
  receipt?: {
    rref: string;
    patient_name: string;
    doctor_name: string;
    clinic_name: string;
    date: string;
    total_free: string;
    diagnosis: string;
  };
}
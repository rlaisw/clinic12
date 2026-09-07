import { z } from "zod";

export const ROUTE_OPTIONS = ["oral", "IV", "IM", "SC", "topical", "inhalation"] as const;

export const FREQUENCY_OPTIONS = ["once daily", "twice daily", "three times daily", "four times daily", "every 6 hours", "every 8 hours", "every 12 hours", "per day", "as needed"] as const;

export const DOSAGE_UNIT_OPTIONS = ["tablets", "mg", "mL"] as const;

export const DIAGNOSTIC_RESULT_OPTIONS = [
  "Influenza",
  "Dermatitis",
  "Eczema",
  "Diarrhoea",
  "Gastroenteritis",
  "High Blood Pressure",
  "Gastritis",
  "Hypercholesterolemia",
  "Lumbago",
  "Abdominal colic",
  "DM/IDDM",
  "Allergic Rhinitis",
  "Arthralgia",
  "Headache",
  "Allergic Conjunctivtis",
  "Chest discomfort",
  "Dizziness",
  "Cervicalgia",
  "Urinary infection",
  "Abnormal menstrual bleeding",
  "Other",
] as const;

export const medicalHistorySchema = z.object({
  id: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  diagnosis_date: z.string().min(1, "Diagnosis date is required"),
  notes: z.string().optional(),
});

export const emergencyContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone is required"),
});

export const patientSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["M", "F"]),
  address: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().nullable(),
  blood_type: z.string().optional(),
  allergies: z.string().optional(),
  hkid: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export const patientBackgroundSchema = z.object({
  patient: z.string().optional(),
  chief_complaint: z.string().optional(),
  past_medical_history: z.object({
    illnesses: z.string().optional(),
    surgeries: z.string().optional(),
    injuries: z.string().optional(),
    hospitalizations: z.string().optional(),
  }).optional(),
  social_family_history: z.object({
    smoking: z.enum(["never", "former", "current"]).optional(),
    alcohol: z.enum(["never", "former", "current"]).optional(),
    family_diseases: z.string().optional(),
  }).optional(),
  occupation: z.string().optional(),
});

export type PatientBackgroundFormValues = z.infer<typeof patientBackgroundSchema>;

export const activeMedicationSchema = z.object({
  patient: z.string().min(1, "Patient ID is required"),
  item: z.number().min(1, "Item number is required"),
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  route: z.string().min(1, "Route is required"),
  frequency: z.string().min(1, "Frequency is required"),
  days_supply: z.number().optional(),
  diagnostic_result: z.string().optional(),
  start_date: z.string().optional(),
});

export type ActiveMedicationFormValues = z.infer<typeof activeMedicationSchema>;

export const pastMedicationSchema = z.object({
  patient: z.string().min(1, "Patient ID is required"),
  item: z.number().min(1, "Item number is required"),
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  route: z.string().min(1, "Route is required"),
  frequency: z.string().min(1, "Frequency is required"),
  days_supply: z.number().optional(),
  diagnostic_result: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  reason_discontinuation: z.string().optional(),
});

export type PastMedicationFormValues = z.infer<typeof pastMedicationSchema>;

export const allergySchema = z.object({
  patient: z.string().min(1, "Patient ID is required"),
  substance: z.string().min(1, "Substance is required"),
  reaction: z.string().min(1, "Reaction is required"),
  severity: z.enum(["mild", "moderate", "severe"]),
});

export type AllergyFormValues = z.infer<typeof allergySchema>;

export const prescriptionMedicationSchema = z.object({
  patient: z.string().min(1, "Patient ID is required"),
  item: z.number().min(1, "Item number is required"),
  medication_name: z.string().min(1, "Medication name is required"),
  dosage_amount: z.number().min(1, "Dosage amount is required"),
  dosage_unit: z.string().min(1, "Dosage unit is required"),
  route: z.string().min(1, "Route is required"),
  frequency: z.string().min(1, "Frequency is required"),
  days_supply: z.number().optional(),
  diagnostic_result: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type PrescriptionMedicationFormValues = z.infer<typeof prescriptionMedicationSchema>;

export const sickLeaveCertificateSchema = z.object({
  consultation_details: z.string().min(1, "Consultation details are required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  recommended_sick_leave: z.string().min(1, "Recommended sick leave is required"),
});

export type SickLeaveCertificateFormValues = z.infer<typeof sickLeaveCertificateSchema>;

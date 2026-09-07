"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { usePatient } from "@/hooks/use-patients";
import { usePatientBackground, useUpdatePatientBackground } from "@/hooks/use-patient-background";
import type { UpdatePatientBackgroundInput } from "@/lib/types";

interface PatientBackgroundFormProps {
  patientId: string;
  disabled?: boolean;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

interface Illness {
  name: string;
  diagnosed: string;
  notes: string;
}

interface Surgery {
  name: string;
  date: string;
  hospital: string;
}

interface Injury {
  type: string;
  date: string;
  notes: string;
}

interface Hospitalization {
  reason: string;
  admission_date: string;
  discharge_date: string;
  hospital: string;
}

interface FamilyDisease {
  relation: string;
  condition: string;
  age_at_diagnosis: string;
}

interface PatientBackgroundFormValues {
  chief_complaint: string;
  past_medical_history: {
    illnesses: Illness[];
    surgeries: Surgery[];
    injuries: Injury[];
    hospitalizations: Hospitalization[];
  };
  social_family_history: {
    smoking: { status: string };
    alcohol: { status: string };
    family_diseases: FamilyDisease[];
  };
  occupation: string;
}

export function PatientBackgroundForm({ patientId, disabled }: PatientBackgroundFormProps) {
  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const { data: background, isLoading: backgroundLoading, refetch } = usePatientBackground(patientId);
  const updateBackground = useUpdatePatientBackground(patientId);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<PatientBackgroundFormValues>({
    defaultValues: {
      chief_complaint: "",
      past_medical_history: {
        illnesses: [],
        surgeries: [],
        injuries: [],
        hospitalizations: [],
      },
      social_family_history: {
        smoking: { status: "never" },
        alcohol: { status: "never" },
        family_diseases: [],
      },
      occupation: "",
    },
  });

  const watchedSmoking = watch("social_family_history.smoking");
  const watchedAlcohol = watch("social_family_history.alcohol");

  const { fields: illnessFields, append: appendIllness, remove: removeIllness } = useFieldArray({
    control,
    name: "past_medical_history.illnesses",
  });
  const { fields: surgeryFields, append: appendSurgery, remove: removeSurgery } = useFieldArray({
    control,
    name: "past_medical_history.surgeries",
  });
  const { fields: injuryFields, append: appendInjury, remove: removeInjury } = useFieldArray({
    control,
    name: "past_medical_history.injuries",
  });
  const { fields: hospitalizationFields, append: appendHospitalization, remove: removeHospitalization } = useFieldArray({
    control,
    name: "past_medical_history.hospitalizations",
  });
  const { fields: familyDiseaseFields, append: appendFamilyDisease, remove: removeFamilyDisease } = useFieldArray({
    control,
    name: "social_family_history.family_diseases",
  });

  useEffect(() => {
    if (background) {
      reset({
        chief_complaint: (background as any).chief_complaint || "",
        past_medical_history: {
          illnesses: Array.isArray((background as any).past_medical_history?.illnesses) 
            ? (background as any).past_medical_history.illnesses 
            : [],
          surgeries: Array.isArray((background as any).past_medical_history?.surgeries) 
            ? (background as any).past_medical_history.surgeries 
            : [],
          injuries: Array.isArray((background as any).past_medical_history?.injuries) 
            ? (background as any).past_medical_history.injuries 
            : [],
          hospitalizations: Array.isArray((background as any).past_medical_history?.hospitalizations) 
            ? (background as any).past_medical_history.hospitalizations 
            : [],
        },
        social_family_history: {
          smoking: typeof (background as any).social_family_history?.smoking === 'object' 
            ? (background as any).social_family_history.smoking 
            : { status: "never" },
          alcohol: typeof (background as any).social_family_history?.alcohol === 'object' 
            ? (background as any).social_family_history.alcohol 
            : { status: "never" },
          family_diseases: Array.isArray((background as any).social_family_history?.family_diseases) 
            ? (background as any).social_family_history.family_diseases 
            : [],
        },
        occupation: (background as any).occupation || "",
      });
    }
  }, [background, reset]);

  if (patientLoading || backgroundLoading) {
    return <div className="text-sm text-muted-foreground">Loading patient information...</div>;
  }

  if (!patient) {
    return <div className="text-sm text-red-500">Patient not found.</div>;
  }

  const dateOfBirth = patient.date_of_birth;
  const age = dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const onSubmit = async (data: PatientBackgroundFormValues) => {
    setFormError(null);
    const submitData: UpdatePatientBackgroundInput = {
      chief_complaint: data.chief_complaint,
      past_medical_history: data.past_medical_history as any,
      social_family_history: data.social_family_history as any,
      occupation: data.occupation,
    };
    updateBackground.mutate(
      { patientId, data: submitData },
      {
        onSuccess: () => {
          refetch();
        },
        onError: (error: ApiError) => {
          const errMsg = error?.response?.data?.detail || error?.message || "Failed to save changes.";
          setFormError(errMsg);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <p className="text-xs text-red-500">{formError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name (Read-only)</Label>
            <Input
              value={`${patient.first_name} ${patient.last_name}`}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label>Date of Birth (Read-only)</Label>
            <Input
              value={new Date(dateOfBirth).toLocaleDateString()}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label>Age (Auto-calculated)</Label>
            <Input value={age !== null ? `${age} years` : ""} readOnly disabled className="bg-muted" />
          </div>

          <div>
            <Label>Sex (Read-only)</Label>
            <Input
              value={patient.gender === "M" ? "Male" : "Female"}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              {...register("occupation")}
              placeholder="Enter occupation"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <Label htmlFor="chief_complaint">Chief Complaint</Label>
        <Textarea
          id="chief_complaint"
          {...register("chief_complaint")}
          placeholder="Enter chief complaint"
          rows={3}
          disabled={disabled}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Medical History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>Illnesses</Label>
            {illnessFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-4"
                  placeholder="Name"
                  {...register(`past_medical_history.illnesses.${index}.name` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-3"
                  placeholder="Diagnosed date"
                  {...register(`past_medical_history.illnesses.${index}.diagnosed` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-4"
                  placeholder="Notes"
                  {...register(`past_medical_history.illnesses.${index}.notes` as const)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIllness(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendIllness({ name: "", diagnosed: "", notes: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Illness
              </Button>
            )}
          </div>

          <div>
            <Label>Surgeries</Label>
            {surgeryFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-4"
                  placeholder="Name"
                  {...register(`past_medical_history.surgeries.${index}.name` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-3"
                  placeholder="Date"
                  {...register(`past_medical_history.surgeries.${index}.date` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-4"
                  placeholder="Hospital"
                  {...register(`past_medical_history.surgeries.${index}.hospital` as const)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSurgery(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSurgery({ name: "", date: "", hospital: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Surgery
              </Button>
            )}
          </div>

          <div>
            <Label>Injuries</Label>
            {injuryFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-4"
                  placeholder="Type"
                  {...register(`past_medical_history.injuries.${index}.type` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-3"
                  placeholder="Date"
                  {...register(`past_medical_history.injuries.${index}.date` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-4"
                  placeholder="Notes"
                  {...register(`past_medical_history.injuries.${index}.notes` as const)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInjury(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendInjury({ type: "", date: "", notes: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Injury
              </Button>
            )}
          </div>

          <div>
            <Label>Hospitalizations</Label>
            {hospitalizationFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-3"
                  placeholder="Reason"
                  {...register(`past_medical_history.hospitalizations.${index}.reason` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-2"
                  placeholder="Admit date"
                  {...register(`past_medical_history.hospitalizations.${index}.admission_date` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-2"
                  placeholder="Discharge date"
                  {...register(`past_medical_history.hospitalizations.${index}.discharge_date` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-3"
                  placeholder="Hospital"
                  {...register(`past_medical_history.hospitalizations.${index}.hospital` as const)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHospitalization(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendHospitalization({ reason: "", admission_date: "", discharge_date: "", hospital: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Hospitalization
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social & Family History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="smoking">Smoking</Label>
            <select
              id="smoking"
              className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
              {...register("social_family_history.smoking.status")}
              disabled={disabled}
            >
              <option value="never">Never</option>
              <option value="former">Former</option>
              <option value="current_light">Current Light</option>
              <option value="current_heavy">Current Heavy</option>
            </select>
          </div>

          <div>
            <Label htmlFor="alcohol">Alcohol</Label>
            <select
              id="alcohol"
              className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
              {...register("social_family_history.alcohol.status")}
              disabled={disabled}
            >
              <option value="never">Never</option>
              <option value="social">Social</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label>Family Diseases</Label>
            {familyDiseaseFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input
                  className="col-span-3"
                  placeholder="Relation"
                  {...register(`social_family_history.family_diseases.${index}.relation` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-4"
                  placeholder="Condition"
                  {...register(`social_family_history.family_diseases.${index}.condition` as const)}
                  disabled={disabled}
                />
                <Input
                  className="col-span-3"
                  placeholder="Age at diagnosis"
                  {...register(`social_family_history.family_diseases.${index}.age_at_diagnosis` as const)}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFamilyDisease(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendFamilyDisease({ relation: "", condition: "", age_at_diagnosis: "" })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Family Disease
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!disabled && (
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || updateBackground.isPending}>
            {updateBackground.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </form>
  );
}
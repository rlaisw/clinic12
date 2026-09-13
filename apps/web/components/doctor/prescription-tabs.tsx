"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePatient } from "@/hooks/use-patients";
import { useMedications } from "@/hooks/use-medications";
import { usePrescriptions, useDeletePrescriptionMedication, useCreatePrescriptionMedication, useUpdatePrescriptionMedication, useCreatePastMedication, usePastMedications } from "@/hooks/use-patient-background";
import { prescriptionMedicationSchema, ROUTE_OPTIONS, DOSAGE_UNIT_OPTIONS, FREQUENCY_OPTIONS, DIAGNOSTIC_RESULT_OPTIONS } from "@/lib/validations";
import type { PrescriptionMedicationFormValues } from "@/lib/validations";
import type { CreatePrescriptionMedicationInput } from "@/lib/types";
import { useForm } from "react-hook-form";
import { PlusIcon, TrashIcon, PencilIcon } from "lucide-react";

interface PrescriptionTabsProps {
  patientId: string;
  disabled?: boolean;
}

export function PrescriptionTabs({ patientId, disabled }: PrescriptionTabsProps) {
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [prescriptionEditId, setPrescriptionEditId] = useState<string | null>(null);
  const [isMovingAll, setIsMovingAll] = useState(false);
  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const { data: medications = [] } = useMedications();
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions(patientId);
  const { data: existingPastMeds = [] } = usePastMedications(patientId);
  const deletePrescription = useDeletePrescriptionMedication(patientId);
  const createPastMed = useCreatePastMedication(patientId);

  const startingItem = existingPastMeds.length + 1;

  const moveAllToPast = async () => {
    if (!prescriptions || prescriptions.length === 0) return;
    setIsMovingAll(true);
    try {
      for (let i = 0; i < prescriptions.length; i++) {
        const presc = prescriptions[i];
        if (!presc) continue;
        await createPastMed.mutateAsync({
          patient: patientId,
          item: startingItem + i,
          name: presc.medication_name,
          dosage: `${presc.dosage_amount} ${presc.dosage_unit}`,
          route: presc.route,
          frequency: presc.frequency,
          days_supply: presc.days_supply,
          diagnostic_result: presc.diagnostic_result || "",
          start_date: presc.start_date || "",
          end_date: presc.end_date || "",
        });
        await deletePrescription.mutateAsync(presc.id);
      }
    } catch (err) {
      console.error("Failed to move prescriptions to past medications", err);
    } finally {
      setIsMovingAll(false);
    }
  };

  const dateOfBirth = patient?.date_of_birth;
  const age = dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const prescriptionToEdit = prescriptions?.find(presc => presc.id === prescriptionEditId);

  if (patientLoading) {
    return <div className="text-sm text-muted-foreground">Loading patient information...</div>;
  }

  if (!patient) {
    return <div className="text-sm text-red-500">Patient not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prescription Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Patient Name (Read-only)</Label>
            <Input
              value={`${patient.first_name} ${patient.last_name}`}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label>Age (Auto-calculated)</Label>
            <Input value={age !== null ? `${age} years` : ""} readOnly disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prescription Medications</span>
            {!disabled && (
              <div className="flex items-center gap-2">
                <Dialog open={prescriptionModalOpen} onOpenChange={setPrescriptionModalOpen}>
                  <Button size="sm" variant="outline" onClick={() => setPrescriptionModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Prescription Medication</DialogTitle>
                    </DialogHeader>
                    <PrescriptionForm
                      patientId={patientId}
                      medications={medications}
                      existingCount={prescriptions?.length || 0}
                      onSuccess={() => setPrescriptionModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                {prescriptions && prescriptions.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={moveAllToPast}
                    disabled={isMovingAll}
                  >
                    {isMovingAll ? "Moving..." : "Move to Past Medications"}
                  </Button>
                )}
                {prescriptionToEdit && (
                  <Dialog open={!!prescriptionEditId} onOpenChange={(open) => !open && setPrescriptionEditId(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Prescription Medication</DialogTitle>
                      </DialogHeader>
                      <PrescriptionForm
                        patientId={patientId}
                        medications={medications}
                        existingCount={prescriptions?.length || 0}
                        prescriptionId={prescriptionEditId}
                        defaultValues={{
                          patient: patientId,
                          item: prescriptionToEdit.item,
                          medication_name: prescriptionToEdit.medication_name,
                          dosage_amount: prescriptionToEdit.dosage_amount,
                          dosage_unit: prescriptionToEdit.dosage_unit,
                          route: prescriptionToEdit.route,
                          frequency: prescriptionToEdit.frequency,
                          days_supply: prescriptionToEdit.days_supply ?? undefined,
                          diagnostic_result: prescriptionToEdit.diagnostic_result || "",
                          start_date: prescriptionToEdit.start_date || undefined,
                          end_date: prescriptionToEdit.end_date || undefined,
                        }}
                        onSuccess={() => setPrescriptionEditId(null)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <PrescriptionTable
              prescriptions={prescriptions || []}
              medications={medications}
              disabled={disabled}
              onDelete={deletePrescription.mutate}
              onEdit={setPrescriptionEditId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PrescriptionTableProps {
  prescriptions: Array<{
    id: string;
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
  }>;
  medications: Array<{ id?: string; name: string }>;
  disabled?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function PrescriptionTable({ prescriptions, medications, disabled, onDelete, onEdit }: PrescriptionTableProps) {
  if (prescriptions.length === 0) {
    return <p className="text-sm text-muted-foreground">No prescription medications recorded.</p>;
  }

  const medicationMap = new Map(medications.map(med => [med.id, med.name]));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Medication Name</TableHead>
            <TableHead>Dosage</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Days Supply</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Diagnostic Result</TableHead>
            {!disabled && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {prescriptions.map((presc) => (
            <TableRow key={presc.id}>
              <TableCell>{presc.item}</TableCell>
              <TableCell>{medicationMap.get(presc.medication_name) || presc.medication_name}</TableCell>
              <TableCell>{presc.dosage_amount} {presc.dosage_unit}</TableCell>
              <TableCell>{presc.route}</TableCell>
              <TableCell>{presc.frequency}</TableCell>
              <TableCell>{presc.days_supply ?? "—"}</TableCell>
              <TableCell>{presc.start_date && new Date(presc.start_date).toLocaleDateString()}</TableCell>
              <TableCell>{presc.end_date && new Date(presc.end_date).toLocaleDateString()}</TableCell>
              <TableCell>{presc.diagnostic_result || "—"}</TableCell>
              {!disabled && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(presc.id)}>
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(presc.id)}>
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface PrescriptionFormProps {
  patientId: string;
  medications: Array<{ id?: string; name: string }>;
  existingCount: number;
  prescriptionId?: string | null;
  defaultValues?: PrescriptionMedicationFormValues;
  onSuccess: () => void;
}

function PrescriptionForm({ patientId, medications, existingCount, prescriptionId, defaultValues, onSuccess }: PrescriptionFormProps) {
  const createPrescriptionMutate = useCreatePrescriptionMedication(patientId);
  const updateMutation = useUpdatePrescriptionMedication(patientId);
  const { register, handleSubmit, setError, setValue, watch, formState: { isSubmitting, errors } } = useForm<PrescriptionMedicationFormValues>({
    defaultValues: defaultValues || {
      patient: patientId,
      item: existingCount + 1,
      medication_name: "",
      dosage_amount: 1,
      dosage_unit: "tablets",
      route: "oral",
      frequency: "per day",
      days_supply: undefined,
      diagnostic_result: "",
      start_date: undefined,
      end_date: undefined,
    },
  });

  const diagnosticResult = watch("diagnostic_result");
  const startDate = watch("start_date");
  const daysSupply = watch("days_supply");
  const [otherDiagnosticResult, setOtherDiagnosticResult] = useState("");

  useEffect(() => {
    if (!defaultValues?.start_date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setValue("start_date", todayStr);
      setValue("end_date", todayStr);
    }
  }, [defaultValues, setValue]);

  useEffect(() => {
    if (startDate && daysSupply && !Number.isNaN(daysSupply) && Number(daysSupply) > 0) {
      const parts = startDate.split("-").map(Number);
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      if (year !== undefined && month !== undefined && day !== undefined) {
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + Number(daysSupply) - 1);
        const endYyyy = date.getFullYear();
        const endMm = String(date.getMonth() + 1).padStart(2, "0");
        const endDd = String(date.getDate()).padStart(2, "0");
        setValue("end_date", `${endYyyy}-${endMm}-${endDd}`);
      }
    }
  }, [startDate, daysSupply, setValue]);

  const onSubmit = async (data: PrescriptionMedicationFormValues) => {
    let finalDiagnosticResult = data.diagnostic_result;
    if (finalDiagnosticResult === "Other") {
      finalDiagnosticResult = otherDiagnosticResult || "Other";
    }
    const cleanedData = {
      ...data,
      diagnostic_result: finalDiagnosticResult,
      days_supply: typeof data.days_supply === "number" && !Number.isNaN(data.days_supply) ? data.days_supply : undefined,
      dosage_amount: data.dosage_amount !== undefined && data.dosage_amount !== null
        ? (typeof data.dosage_amount === "number" ? data.dosage_amount : parseFloat(data.dosage_amount as string))
        : undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    };
    const result = prescriptionMedicationSchema.safeParse(cleanedData);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof PrescriptionMedicationFormValues;
        setError(fieldName, { type: "validation", message: issue.message });
      });
      return;
    }
      if (prescriptionId) {
        updateMutation.mutate(
          { id: prescriptionId, data: result.data },
          {
            onSuccess,
            onError: (err: Error) => {
              setError("root" as keyof PrescriptionMedicationFormValues, { type: "server", message: err.message });
            },
          }
        );
      } else {
        createPrescriptionMutate.mutate(result.data as CreatePrescriptionMedicationInput, {
          onSuccess,
          onError: (err: Error) => {
            setError("root" as keyof PrescriptionMedicationFormValues, { type: "server", message: err.message });
          },
        });
      }
  };

  const fieldError = (name: string) => (errors as any)[name]?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="item">Item</Label>
        <Input
          id="item"
          type="number"
          min={1}
          {...register("item", { valueAsNumber: true })}
        />
        {errors.item && <p className="text-xs text-red-500 mt-1">{fieldError("item")}</p>}
      </div>

      <div>
        <Label htmlFor="medication_name">Medication Name</Label>
          <select
            id="medication_name"
            className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
            {...register("medication_name")}
          >
          <option value="">Select medication</option>
          {medications.map((med) => (
            <option key={med.id} value={med.name}>{med.name}</option>
          ))}
        </select>
        {errors.medication_name && <p className="text-xs text-red-500 mt-1">{fieldError("medication_name")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="dosage_amount">Dosage Amount</Label>
          <Input id="dosage_amount" type="number" {...register("dosage_amount", { valueAsNumber: true })} />
          {errors.dosage_amount && <p className="text-xs text-red-500 mt-1">{fieldError("dosage_amount")}</p>}
        </div>
        <div>
          <Label htmlFor="dosage_unit">Dosage Unit</Label>
          <select
            id="dosage_unit"
            className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
            {...register("dosage_unit")}
          >
            {DOSAGE_UNIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.dosage_unit && <p className="text-xs text-red-500 mt-1">{fieldError("dosage_unit")}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="route">Route</Label>
        <select
          id="route"
          className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
          {...register("route")}
        >
          {ROUTE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errors.route && <p className="text-xs text-red-500 mt-1">{fieldError("route")}</p>}
      </div>

      <div>
        <Label htmlFor="frequency">Frequency</Label>
        <select
          id="frequency"
          className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
          {...register("frequency")}
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errors.frequency && <p className="text-xs text-red-500 mt-1">{fieldError("frequency")}</p>}
      </div>

      <div>
        <Label htmlFor="days_supply">Days Supply</Label>
        <Input id="days_supply" type="number" min={1} {...register("days_supply", { valueAsNumber: true })} />
        {errors.days_supply && <p className="text-xs text-red-500 mt-1">{fieldError("days_supply")}</p>}
      </div>

      <div>
        <Label htmlFor="diagnostic_result">Diagnostic Result</Label>
        <select
          id="diagnostic_result"
          className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
          {...register("diagnostic_result")}
        >
          <option value="">Select diagnostic result</option>
          {DIAGNOSTIC_RESULT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {diagnosticResult === "Other" && (
          <Input
            id="other-diagnostic-result"
            placeholder="Enter custom diagnostic result"
            value={otherDiagnosticResult}
            onChange={(e) => setOtherDiagnosticResult(e.target.value)}
            className="mt-2"
          />
        )}
        {errors.diagnostic_result && <p className="text-xs text-red-500 mt-1">{fieldError("diagnostic_result")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
          {errors.start_date && <p className="text-xs text-red-500 mt-1">{fieldError("start_date")}</p>}
        </div>
        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && <p className="text-xs text-red-500 mt-1">{fieldError("end_date")}</p>}
        </div>
      </div>

      {errors.root && <p className="text-xs text-red-500">{fieldError("root")}</p>}

      <Button type="submit" disabled={isSubmitting || createPrescriptionMutate.isPending || updateMutation.isPending} className="w-full">
        {createPrescriptionMutate.isPending || updateMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
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
import { Badge } from "@/components/ui/badge";
import { useActiveMedications, useDeleteActiveMedication } from "@/hooks/use-patient-background";
import { usePastMedications, useDeletePastMedication } from "@/hooks/use-patient-background";
import { useAllergies, useDeleteAllergy } from "@/hooks/use-patient-background";
import { activeMedicationSchema, pastMedicationSchema, allergySchema, ROUTE_OPTIONS, FREQUENCY_OPTIONS, DIAGNOSTIC_RESULT_OPTIONS } from "@/lib/validations";
import type { ActiveMedicationFormValues, PastMedicationFormValues, AllergyFormValues } from "@/lib/validations";
import type { CreateActiveMedicationInput, CreatePastMedicationInput, CreateAllergyInput } from "@/lib/types";
import { useForm } from "react-hook-form";
import { PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { useCreateActiveMedication, useUpdateActiveMedication } from "@/hooks/use-patient-background";
import { useCreatePastMedication, useUpdatePastMedication } from "@/hooks/use-patient-background";
import { useCreateAllergy, useUpdateAllergy } from "@/hooks/use-patient-background";
import { usePatient } from "@/hooks/use-patients";

interface MedicationHistoryTabsProps {
  patientId: string;
  disabled?: boolean;
}

export function MedicationHistoryTabs({ patientId, disabled }: MedicationHistoryTabsProps) {
  const [activeMedModalOpen, setActiveMedModalOpen] = useState(false);
  const [activeMedEditId, setActiveMedEditId] = useState<string | null>(null);
  const [pastMedModalOpen, setPastMedModalOpen] = useState(false);
  const [pastMedEditId, setPastMedEditId] = useState<string | null>(null);
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [allergyEditId, setAllergyEditId] = useState<string | null>(null);

  const { data: patient } = usePatient(patientId);

  const dateOfBirth = patient?.date_of_birth;
  const age = dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const { data: activeMeds, isLoading: activeLoading } = useActiveMedications(patientId);
  const { data: pastMeds, isLoading: pastLoading } = usePastMedications(patientId);
  const { data: allergieData, isLoading: allergyLoading } = useAllergies(patientId);

  const deleteActiveMed = useDeleteActiveMedication(patientId);
  const deletePastMed = useDeletePastMedication(patientId);
  const deleteAllergy = useDeleteAllergy(patientId);

  const activeMedToEdit = activeMeds?.find(med => med.id === activeMedEditId);
  const pastMedToEdit = pastMeds?.find(med => med.id === pastMedEditId);
  const allergyToEdit = allergieData?.find(allergy => allergy.id === allergyEditId);

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
              value={patient ? `${patient.first_name} ${patient.last_name}` : "Loading..."}
              readOnly
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label>Age (Auto-calculated)</Label>
            <Input value={age !== null ? `${age} years` : "Loading..."} readOnly disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Medications</span>
            {!disabled && (
              <>
                <Dialog open={activeMedModalOpen} onOpenChange={setActiveMedModalOpen}>
                  <Button size="sm" variant="outline" onClick={() => setActiveMedModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Active Medication</DialogTitle>
                    </DialogHeader>
                    <ActiveMedicationForm
                      patientId={patientId}
                      existingCount={activeMeds?.length || 0}
                      onSuccess={() => setActiveMedModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                {activeMedToEdit && (
                  <Dialog open={!!activeMedEditId} onOpenChange={(open) => !open && setActiveMedEditId(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Active Medication</DialogTitle>
                      </DialogHeader>
                      <ActiveMedicationForm
                        patientId={patientId}
                        medicationId={activeMedEditId}
                        existingCount={activeMeds?.length || 0}
                        defaultValues={{
                          patient: patientId,
                          item: activeMedToEdit.item,
                          name: activeMedToEdit.name,
                          dosage: activeMedToEdit.dosage,
                          route: activeMedToEdit.route,
                          frequency: activeMedToEdit.frequency,
                          days_supply: activeMedToEdit.days_supply ?? undefined,
                          diagnostic_result: activeMedToEdit.diagnostic_result || "",
                          start_date: activeMedToEdit.start_date || "",
                        }}
                        onSuccess={() => setActiveMedEditId(null)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <MedicationTable
              medications={activeMeds || []}
              disabled={disabled}
              onDelete={deleteActiveMed.mutate}
              onEdit={setActiveMedEditId}
              type="active"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Past Medications</span>
            {!disabled && (
              <>
                <Dialog open={pastMedModalOpen} onOpenChange={setPastMedModalOpen}>
                  <Button size="sm" variant="outline" onClick={() => setPastMedModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Past Medication</DialogTitle>
                    </DialogHeader>
                    <PastMedicationForm
                      patientId={patientId}
                      existingCount={pastMeds?.length || 0}
                      onSuccess={() => setPastMedModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                {pastMedToEdit && (
                  <Dialog open={!!pastMedEditId} onOpenChange={(open) => !open && setPastMedEditId(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Past Medication</DialogTitle>
                      </DialogHeader>
                      <PastMedicationForm
                        patientId={patientId}
                        medicationId={pastMedEditId}
                        existingCount={pastMeds?.length || 0}
                        defaultValues={{
                          patient: patientId,
                          item: pastMedToEdit.item,
                          name: pastMedToEdit.name,
                          dosage: pastMedToEdit.dosage,
                          route: pastMedToEdit.route,
                          frequency: pastMedToEdit.frequency,
                          days_supply: pastMedToEdit.days_supply ?? undefined,
                          diagnostic_result: pastMedToEdit.diagnostic_result || "",
                          start_date: pastMedToEdit.start_date || "",
                          end_date: pastMedToEdit.end_date || "",
                          reason_discontinuation: pastMedToEdit.reason_discontinuation || "",
                        }}
                        onSuccess={() => setPastMedEditId(null)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <MedicationTable
              medications={pastMeds || []}
              disabled={disabled}
              onDelete={deletePastMed.mutate}
              onEdit={setPastMedEditId}
              type="past"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Allergies</span>
            {!disabled && (
              <>
                <Dialog open={allergyModalOpen} onOpenChange={setAllergyModalOpen}>
                  <Button size="sm" variant="outline" onClick={() => setAllergyModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Allergy</DialogTitle>
                    </DialogHeader>
                    <AllergyForm
                      patientId={patientId}
                      onSuccess={() => setAllergyModalOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                {allergyToEdit && (
                  <Dialog open={!!allergyEditId} onOpenChange={(open) => !open && setAllergyEditId(null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Allergy</DialogTitle>
                      </DialogHeader>
                      <AllergyForm
                        patientId={patientId}
                        allergyId={allergyEditId}
                        defaultValues={{
                          patient: patientId,
                          substance: allergyToEdit.substance,
                          reaction: allergyToEdit.reaction,
                          severity: allergyToEdit.severity,
                        }}
                        onSuccess={() => setAllergyEditId(null)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allergyLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <AllergyTable
              allergies={allergieData || []}
              disabled={disabled}
              onDelete={deleteAllergy.mutate}
              onEdit={setAllergyEditId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MedicationTableProps {
  medications: Array<{
    id: string;
    item: number;
    name: string;
    dosage: string;
    route: string;
    frequency: string;
    days_supply?: number;
    diagnostic_result?: string;
    start_date: string;
    end_date?: string;
    reason_discontinuation?: string;
  }>;
  disabled?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  type: "active" | "past";
}

function MedicationTable({ medications, disabled, onDelete, onEdit, type }: MedicationTableProps) {
  if (medications.length === 0) {
    return <p className="text-sm text-muted-foreground">No {type} medications recorded.</p>;
  }

  const sortedMeds = type === "past"
    ? [...medications].sort((a, b) => b.item - a.item)
    : medications;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Dosage</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Days Supply</TableHead>
            <TableHead>Start Date</TableHead>
            {type === "past" && <TableHead>End Date</TableHead>}
            <TableHead>Diagnostic Result</TableHead>
            {!disabled && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMeds.map((med) => (
            <TableRow key={med.id}>
              <TableCell>{med.item}</TableCell>
              <TableCell>{med.name}</TableCell>
              <TableCell>{med.dosage}</TableCell>
              <TableCell>{med.route}</TableCell>
              <TableCell>{med.frequency}</TableCell>
              <TableCell>{med.days_supply ?? "—"}</TableCell>
              <TableCell>{new Date(med.start_date).toLocaleDateString()}</TableCell>
              {type === "past" && <TableCell>{med.end_date && new Date(med.end_date).toLocaleDateString()}</TableCell>}
              <TableCell>{med.diagnostic_result || "—"}</TableCell>
              {!disabled && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(med.id)}>
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(med.id)}>
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

interface ActiveMedicationFormProps {
  patientId: string;
  medicationId?: string | null;
  existingCount: number;
  defaultValues?: ActiveMedicationFormValues;
  onSuccess: () => void;
}

function ActiveMedicationForm({ patientId, medicationId, existingCount, defaultValues, onSuccess }: ActiveMedicationFormProps) {
  const createActiveMed = useCreateActiveMedication(patientId);
  const updateMutation = useUpdateActiveMedication(patientId);
  const { register, handleSubmit, setError, setValue, watch, formState: { isSubmitting, errors } } = useForm<ActiveMedicationFormValues>({
    defaultValues: defaultValues || {
      patient: patientId,
      item: existingCount + 1,
      name: "",
      dosage: "",
      route: "oral",
      frequency: "per day",
      days_supply: undefined,
      diagnostic_result: "",
      start_date: "",
    },
  });

  const diagnosticResult = watch("diagnostic_result");
  const [otherDiagnosticResult, setOtherDiagnosticResult] = useState("");

  useEffect(() => {
    if (defaultValues?.diagnostic_result) {
      const diagnosticResultValue = defaultValues.diagnostic_result;
      if ((DIAGNOSTIC_RESULT_OPTIONS as readonly string[]).includes(diagnosticResultValue)) {
        setOtherDiagnosticResult("");
      } else {
        setOtherDiagnosticResult(diagnosticResultValue);
        setValue("diagnostic_result", "Other");
      }
    }
  }, [defaultValues, setValue]);

  useEffect(() => {
    if (!defaultValues?.start_date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setValue("start_date", `${yyyy}-${mm}-${dd}`);
    }
  }, [defaultValues, setValue]);

  const onSubmit = async (data: ActiveMedicationFormValues) => {
    let finalDiagnosticResult = data.diagnostic_result;
    if (finalDiagnosticResult === "Other") {
      finalDiagnosticResult = otherDiagnosticResult || "Other";
    }
    const cleanedData = {
      ...data,
      diagnostic_result: finalDiagnosticResult,
      days_supply: typeof data.days_supply === "number" && !Number.isNaN(data.days_supply) ? data.days_supply : undefined,
    };
    const result = activeMedicationSchema.safeParse(cleanedData);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof ActiveMedicationFormValues;
        setError(fieldName, { type: "validation", message: issue.message });
      });
      return;
    }
    if (medicationId) {
      updateMutation.mutate(
        { id: medicationId, data: result.data },
        {
          onSuccess,
          onError: (err: Error) => {
            setError("root" as keyof ActiveMedicationFormValues, { type: "server", message: err.message });
          },
        }
      );
    } else {
      createActiveMed.mutate(result.data as CreateActiveMedicationInput, {
        onSuccess,
        onError: (err: Error) => {
          setError("root" as keyof ActiveMedicationFormValues, { type: "server", message: err.message });
        },
      });
    }
  };

  const fieldError = (name: string) => (errors as any)[name]?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="item">Item</Label>
        <Input id="item" type="number" min={1} {...register("item", { valueAsNumber: true })} />
        {errors.item && <p className="text-xs text-red-500 mt-1">{fieldError("item")}</p>}
      </div>
      <div>
        <Label htmlFor="name">Medication Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{fieldError("name")}</p>}
      </div>
      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input id="dosage" {...register("dosage")} />
        {errors.dosage && <p className="text-xs text-red-500 mt-1">{fieldError("dosage")}</p>}
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
       <div>
         <Label htmlFor="start_date">Start Date</Label>
        <Input id="start_date" type="date" {...register("start_date")} />
        {errors.start_date && <p className="text-xs text-red-500 mt-1">{fieldError("start_date")}</p>}
      </div>
      {errors.root && <p className="text-xs text-red-500">{fieldError("root")}</p>}
      <Button type="submit" disabled={isSubmitting || createActiveMed.isPending || updateMutation.isPending} className="w-full">
        {createActiveMed.isPending || updateMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

interface PastMedicationFormProps {
  patientId: string;
  medicationId?: string | null;
  existingCount: number;
  defaultValues?: PastMedicationFormValues;
  onSuccess: () => void;
}

function PastMedicationForm({ patientId, medicationId, existingCount, defaultValues, onSuccess }: PastMedicationFormProps) {
  const createPastMed = useCreatePastMedication(patientId);
  const updateMutation = useUpdatePastMedication(patientId);
  const { register, handleSubmit, setError, setValue, watch, formState: { isSubmitting, errors } } = useForm<PastMedicationFormValues>({
    defaultValues: defaultValues || {
      patient: patientId,
      item: existingCount + 1,
      name: "",
      dosage: "",
      route: "oral",
      frequency: "per day",
      days_supply: undefined,
      diagnostic_result: "",
      start_date: "",
      end_date: "",
      reason_discontinuation: "",
    },
  });

  const diagnosticResult = watch("diagnostic_result");
  const [otherDiagnosticResult, setOtherDiagnosticResult] = useState("");
  const startDate = watch("start_date");
  const daysSupply = watch("days_supply");

  useEffect(() => {
    if (defaultValues?.diagnostic_result) {
      const diagnosticResultValue = defaultValues.diagnostic_result;
      if ((DIAGNOSTIC_RESULT_OPTIONS as readonly string[]).includes(diagnosticResultValue)) {
        setOtherDiagnosticResult("");
      } else {
        setOtherDiagnosticResult(diagnosticResultValue);
        setValue("diagnostic_result", "Other");
      }
    }
  }, [defaultValues, setValue]);

  useEffect(() => {
    if (!defaultValues?.start_date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setValue("start_date", `${yyyy}-${mm}-${dd}`);
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

  const onSubmit = async (data: PastMedicationFormValues) => {
    let finalDiagnosticResult = data.diagnostic_result;
    if (finalDiagnosticResult === "Other") {
      finalDiagnosticResult = otherDiagnosticResult || "Other";
    }
    const cleanedData = {
      ...data,
      diagnostic_result: finalDiagnosticResult,
      days_supply: typeof data.days_supply === "number" && !Number.isNaN(data.days_supply) ? data.days_supply : undefined,
    };
    const result = pastMedicationSchema.safeParse(cleanedData);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof PastMedicationFormValues;
        setError(fieldName, { type: "validation", message: issue.message });
      });
      return;
    }
    if (medicationId) {
      updateMutation.mutate(
        { id: medicationId, data: result.data },
        {
          onSuccess,
          onError: (err: Error) => {
            setError("root" as keyof PastMedicationFormValues, { type: "server", message: err.message });
          },
        }
      );
    } else {
      createPastMed.mutate(result.data as CreatePastMedicationInput, {
        onSuccess,
        onError: (err: Error) => {
          setError("root" as keyof PastMedicationFormValues, { type: "server", message: err.message });
        },
      });
    }
  };

  const fieldError = (name: string) => (errors as any)[name]?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="item">Item</Label>
        <Input id="item" type="number" min={1} {...register("item", { valueAsNumber: true })} />
        {errors.item && <p className="text-xs text-red-500 mt-1">{fieldError("item")}</p>}
      </div>
      <div>
        <Label htmlFor="name">Medication Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{fieldError("name")}</p>}
      </div>
      <div>
        <Label htmlFor="dosage">Dosage</Label>
        <Input id="dosage" {...register("dosage")} />
        {errors.dosage && <p className="text-xs text-red-500 mt-1">{fieldError("dosage")}</p>}
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
      <div>
        <Label htmlFor="reason">Reason for Discontinuation</Label>
        <Input id="reason" {...register("reason_discontinuation")} />
      </div>
      {errors.root && <p className="text-xs text-red-500">{fieldError("root")}</p>}
      <Button type="submit" disabled={isSubmitting || createPastMed.isPending || updateMutation.isPending} className="w-full">
        {createPastMed.isPending || updateMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

interface AllergyTableProps {
  allergies: Array<{ id: string; substance: string; reaction: string; severity: string }>;
  disabled?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function AllergyTable({ allergies, disabled, onDelete, onEdit }: AllergyTableProps) {
  if (allergies.length === 0) {
    return <p className="text-sm text-muted-foreground">No allergies recorded.</p>;
  }

  const severityVariant = (severity: string) => {
    switch (severity) {
      case "mild": return "secondary";
      case "moderate": return "default";
      case "severe": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Substance</TableHead>
            <TableHead>Reaction</TableHead>
            <TableHead>Severity</TableHead>
            {!disabled && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allergies.map((allergy) => (
            <TableRow key={allergy.id}>
              <TableCell>{allergy.substance}</TableCell>
              <TableCell>{allergy.reaction}</TableCell>
              <TableCell>
                <Badge variant={severityVariant(allergy.severity)}>
                  {allergy.severity}
                </Badge>
              </TableCell>
              {!disabled && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(allergy.id)}>
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(allergy.id)}>
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

interface AllergyFormProps {
  patientId: string;
  allergyId?: string | null;
  defaultValues?: AllergyFormValues;
  onSuccess: () => void;
}

function AllergyForm({ patientId, allergyId, defaultValues, onSuccess }: AllergyFormProps) {
  const createAllergyMutate = useCreateAllergy(patientId);
  const updateMutation = useUpdateAllergy(patientId);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AllergyFormValues>({
    defaultValues: defaultValues || {
      patient: patientId,
      substance: "",
      reaction: "",
      severity: "mild",
    },
  });

  const onSubmit = async (data: AllergyFormValues) => {
    const result = allergySchema.safeParse(data);
    if (!result.success) return;
    if (allergyId) {
      updateMutation.mutate({ id: allergyId, data: result.data }, { onSuccess });
    } else {
      createAllergyMutate.mutate(result.data as CreateAllergyInput, { onSuccess });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="substance">Substance</Label>
        <Input id="substance" {...register("substance", { required: true })} />
      </div>
      <div>
        <Label htmlFor="reaction">Reaction</Label>
        <Input id="reaction" {...register("reaction", { required: true })} />
      </div>
      <div>
        <Label htmlFor="severity">Severity</Label>
        <select
          id="severity"
          className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30"
          {...register("severity")}
        >
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting || createAllergyMutate.isPending || updateMutation.isPending} className="w-full">
        {createAllergyMutate.isPending || updateMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

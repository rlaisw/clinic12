"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { patientSchema } from "@/lib/validations";
import type { Patient } from "@/lib/types";
import { type PatientFormValues } from "@/lib/validations";
import { useUpdatePatient } from "@/hooks/use-patients";

interface EditPatientModalProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPatientModal({ patient, open, onOpenChange }: EditPatientModalProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const updatePatient = useUpdatePatient(patient?.id || "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    defaultValues: {
      gender: "M",
      address: "",
      blood_type: "",
      allergies: "",
      hkid: "",
    },
  });

  useEffect(() => {
    if (patient) {
      reset({
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email || null,
        address: patient.address || "",
        blood_type: patient.blood_type || "",
        allergies: patient.allergies || "",
        hkid: patient.hkid || "",
      });
    }
  }, [patient, reset]);

  const onSubmit = async (data: PatientFormValues) => {
    if (!patient) return;
    
    const result = patientSchema.safeParse(data);
    if (!result.success) {
      setFormError("Please check the form fields and try again.");
      return;
    }
    setFormError(null);
    updatePatient.mutate({ id: patient.id, data }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>
        {formError && (
          <p className="text-xs text-red-500">{formError}</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register("first_name", { required: true })} />
              {errors.first_name && (
                <p className="text-xs text-red-500">First name is required</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register("last_name", { required: true })} />
              {errors.last_name && (
                <p className="text-xs text-red-500">Last name is required</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input id="date_of_birth" type="date" {...register("date_of_birth", { required: true })} />
              {errors.date_of_birth && (
                <p className="text-xs text-red-500">Date of birth is required</p>
              )}
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                {...register("gender")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone", { required: true })} />
            {errors.phone && (
              <p className="text-xs text-red-500">Phone is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="blood_type">Blood Type</Label>
              <Input id="blood_type" {...register("blood_type")} />
            </div>
            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Input id="allergies" {...register("allergies")} />
            </div>
          </div>
          <div>
            <Label htmlFor="hkid">HKID</Label>
            <Input id="hkid" {...register("hkid")} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || updatePatient.isPending} className="flex-1">
              {updatePatient.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useState } from "react";
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
import type { PatientFormValues } from "@/lib/validations";
import { useCreatePatient } from "@/hooks/use-patients";
import { PlusIcon } from "lucide-react";

export function CreatePatientModal({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const openState = open ?? internalOpen;
  const setOpenState = onOpenChange ?? setInternalOpen;
  const [formError, setFormError] = useState<string | null>(null);
  const createPatient = useCreatePatient();

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
    },
  });

  const onSubmit = async (data: PatientFormValues) => {
    const result = patientSchema.safeParse(data);
    if (!result.success) {
      setFormError("Please check the form fields and try again.");
      return;
    }
    setFormError(null);
    createPatient.mutate(data, {
      onSuccess: () => {
        setOpenState(false);
        reset();
      },
    });
  };

  return (
    <>
      <Button onClick={() => setOpenState(true)}>
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Patient
      </Button>
      <Dialog open={openState} onOpenChange={setOpenState}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
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
            <div className="flex gap-2">
               <Button type="button" variant="outline" onClick={() => setOpenState(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createPatient.isPending} className="flex-1">
                {createPatient.isPending ? "Creating..." : "Create Patient"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

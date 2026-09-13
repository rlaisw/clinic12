"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useCreateMedication } from "@/hooks/use-medications";

const UNIT_OPTIONS = [
  { value: 'TAB', label: 'Tablet' },
  { value: 'CAP', label: 'Capsule' },
  { value: 'MG', label: 'Milligrams' },
  { value: 'ML', label: 'Milliliters' },
];

const ROUTE_OPTIONS = ['oral', 'IV', 'IM', 'SC', 'topical', 'inhalation'];

export default function AddMedicationPage() {
  const createMedication = useCreateMedication();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Record<string, unknown>>({
    defaultValues: {
      name: "",
      generic_name: "",
      category: "",
      unit: "TAB",
      strength: 0,
      dosage_strength: "",
      administration_route: "oral",
      frequency: "DAILY",
      side_effects: "None known",
      supplier_address: "N/A",
      supplier_contact: "N/A",
      stock_value: 0,
      is_active: true,
    },
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    createMedication.mutate(data, {
      onSuccess: () => {
        reset();
      },
      onError: (error: unknown) => {
        setFormError(error instanceof Error ? error.message : 'Failed to create medication. Please try again.');
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Medication</CardTitle>
        <CardDescription>Create a new medication record in the inventory.</CardDescription>
      </CardHeader>
      <CardContent>
        {formError && (
          <p className="text-sm text-red-500 mb-4">{formError}</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Medication Name *</Label>
              <Input id="name" placeholder="Enter medication name" {...register("name", { required: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="generic_name">Generic Name</Label>
              <Input id="generic_name" placeholder="Enter generic name" {...register("generic_name")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="Enter category (e.g., Pain Relief)" {...register("category")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <select id="unit" {...register("unit")} className="h-9 w-full rounded-md border px-2">
                {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dosage_strength">Dosage</Label>
              <Input id="dosage_strength" placeholder="e.g., 500mg" {...register("dosage_strength")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stock_value">Stock Value *</Label>
              <Input id="stock_value" type="number" placeholder="0" {...register("stock_value", { valueAsNumber: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input id="expiry_date" type="date" {...register("expiry_date")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier_name">Supplier Name *</Label>
              <Input id="supplier_name" placeholder="Enter supplier name" {...register("supplier_name", { required: true })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input id="unit_cost" type="number" step="0.01" placeholder="0.00" {...register("unit_cost")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier_contact">Supplier Contact</Label>
              <Input id="supplier_contact" placeholder="Enter contact info" {...register("supplier_contact")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="administration_route">Route</Label>
              <select id="administration_route" {...register("administration_route")} className="h-9 w-full rounded-md border px-2">
                {ROUTE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting || createMedication.isPending} className="w-full">
            {createMedication.isPending ? "Creating..." : "Save Medication"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
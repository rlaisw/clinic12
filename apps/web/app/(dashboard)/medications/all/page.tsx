"use client";

import { useState, useMemo, useEffect } from "react";
import { useMedications, useUpdateMedication, useCreateMedication, useDeleteMedication } from "@/hooks/use-medications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Plus, Search, ArrowUpDown } from "lucide-react";
import type { Medication } from "@/lib/types";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";

type SortField = "name" | "category" | "stock_value" | "stock_status" | "threshold_stock_value" | "expiry_date" | "supplier_name";
type SortDirection = "asc" | "desc";

const UNIT_OPTIONS = [
  { value: 'TAB', label: 'Tablet' },
  { value: 'CAP', label: 'Capsule' },
  { value: 'MG', label: 'Milligrams' },
  { value: 'ML', label: 'Milliliters' },
];

const ROUTE_OPTIONS = ['oral', 'IV', 'IM', 'SC', 'topical', 'inhalation'];

export default function MedicationInventoryPage() {
  const { data: medications = [], isLoading } = useMedications();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const getStockStatusRank = (med: Medication): number => {
    const stock = med.stock_value ?? 0;
    const threshold = med.threshold_stock_value;
    if (threshold !== undefined && stock < threshold) return 0; // Out of Stock
    if (stock === 0) return 0; // Out of Stock
    return 1; // In Stock
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredMedications = useMemo(() => {
    return medications
      .filter(
(med) => med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (med.category?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        
        if (sortField === "stock_status") {
          comparison = getStockStatusRank(a) - getStockStatusRank(b);
        } else {
          const aVal = a[sortField];
          const bVal = b[sortField];
          
          if (aVal === undefined || aVal === null) return 1;
          if (bVal === undefined || bVal === null) return -1;
          
          if (sortField === "stock_value" || sortField === "threshold_stock_value") {
            comparison = (aVal as number) - (bVal as number);
          } else {
            comparison = aVal.toString().localeCompare(bVal.toString());
          }
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [medications, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredMedications.length / PAGE_SIZE);
  const paginatedMeds = filteredMedications.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getSortIcon = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === "asc" 
        ? <ArrowUpDown className="h-3 w-3 ml-1" /> 
        : <ArrowUpDown className="h-3 w-3 ml-1 rotate-180" />;
    }
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  };

  const getStockBadge = (stock_value: number, threshold?: number) => {
    if (threshold !== undefined && stock_value < threshold) {
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>;
    }
    if (stock_value === 0) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>;
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">In Stock</span>;
  };

  const handleEdit = (med: Medication) => {
    setEditingMed(med);
  };

  const deleteMedication = useDeleteMedication();

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this medication?")) {
      deleteMedication.mutate(id);
    }
  };

  // Inline AddMedicationDialog component
  function AddMedicationDialog({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    const createMedication = useCreateMedication();
    const [formError, setFormError] = useState<string | null>(null);

    const {
      register,
      handleSubmit,
      reset,
      formState: { isSubmitting },
    } = useForm<Partial<Medication>>({
      defaultValues: {
        name: "",
        category: "General",
        unit: "TAB",
        strength: 0,
        dosage_strength: "",
        administration_route: "oral",
        frequency: "DAILY",
        side_effects: "None known",
        supplier_address: "N/A",
        supplier_contact: "",
        stock_value: 0,
        threshold_stock_value: 0,
        is_active: true,
      },
    });

    const onSubmit = async (data: Partial<Medication>) => {
      createMedication.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
        onError: (error: any) => {
          setFormError(error?.response?.data ? JSON.stringify(error.response.data) : 'Failed to create medication. Please try again.');
        },
      });
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
          </DialogHeader>
          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name", { required: true })} />
              </div>
              <div>
                <Label htmlFor="generic_name">Generic Name</Label>
                <Input id="generic_name" {...register("generic_name")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register("category")} />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <select id="unit" {...register("unit")} className="h-9 w-full rounded-md border px-2">
                  {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="dosage_strength">Dosage</Label>
                <Input id="dosage_strength" {...register("dosage_strength")} placeholder="e.g., 500mg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock_value">Stock Value</Label>
                <Input id="stock_value" type="number" {...register("stock_value", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="threshold_stock_value">Threshold Stock</Label>
                <Input id="threshold_stock_value" type="number" {...register("threshold_stock_value", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input id="expiry_date" type="date" {...register("expiry_date")} />
              </div>
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input id="supplier_name" {...register("supplier_name")} />
              </div>
              <div>
                <Label htmlFor="supplier_contact">Supplier Contact</Label>
                <Input id="supplier_contact" {...register("supplier_contact")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="administration_route">Route</Label>
                <select id="administration_route" {...register("administration_route")} className="h-9 w-full rounded-md border px-2">
                  {ROUTE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Input id="frequency" {...register("frequency")} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || createMedication.isPending} className="flex-1">
                {createMedication.isPending ? "Creating..." : "Create Medication"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Inline EditMedicationDialog component
  function EditMedicationDialog({
    medication,
    open,
    onOpenChange,
  }: {
    medication: Medication | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    const updateMedication = useUpdateMedication();
    const [formError, setFormError] = useState<string | null>(null);

    const {
      register,
      handleSubmit,
      reset,
      formState: { isSubmitting },
    } = useForm<Partial<Medication>>({
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
        threshold_stock_value: 0,
        stock_value: 0,
      },
    });

    useEffect(() => {
      if (medication) {
        reset({
          name: medication.name,
          generic_name: medication.generic_name || "",
          category: medication.category || "",
          unit: medication.unit || "TAB",
          strength: medication.strength || 0,
          dosage_strength: medication.dosage_strength || "",
          administration_route: medication.administration_route || "oral",
          frequency: medication.frequency || "DAILY",
          side_effects: medication.side_effects || "None known",
          threshold_stock_value: medication.threshold_stock_value ?? 0,
          stock_value: medication.stock_value || 0,
        });
      }
    }, [medication, reset]);

    const onSubmit = async (data: Partial<Medication>) => {
      if (!medication) return;
      
      updateMedication.mutate({ id: medication.id!, data }, {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: () => {
          setFormError('Failed to save changes. Please try again.');
        },
      });
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
          </DialogHeader>
          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name", { required: true })} />
              </div>
              <div>
                <Label htmlFor="generic_name">Generic Name</Label>
                <Input id="generic_name" {...register("generic_name")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register("category")} />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <select id="unit" {...register("unit")} className="h-9 w-full rounded-md border px-2">
                  {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="dosage_strength">Dosage</Label>
                <Input id="dosage_strength" {...register("dosage_strength")} placeholder="e.g., 500mg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock_value">Stock Value</Label>
                <Input id="stock_value" type="number" {...register("stock_value", { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="threshold_stock_value">Threshold Stock</Label>
                <Input id="threshold_stock_value" type="number" {...register("threshold_stock_value", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input id="expiry_date" type="date" {...register("expiry_date")} />
              </div>
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input id="supplier_name" {...register("supplier_name")} />
              </div>
              <div>
                <Label htmlFor="supplier_contact">Supplier Contact</Label>
                <Input id="supplier_contact" {...register("supplier_contact")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="administration_route">Route</Label>
                <select id="administration_route" {...register("administration_route")} className="h-9 w-full rounded-md border px-2">
                  {ROUTE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Input id="frequency" {...register("frequency")} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || updateMedication.isPending} className="flex-1">
                {updateMedication.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Medications</CardTitle>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medications..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8">Loading...</p>
        ) : filteredMedications.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No medication records found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Name {getSortIcon("name")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                  <div className="flex items-center">Category {getSortIcon("category")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("stock_status")}>
                  <div className="flex items-center">Stock {getSortIcon("stock_status")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("stock_value")}>
                  <div className="flex items-center">Stock Value {getSortIcon("stock_value")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("threshold_stock_value")}>
                  <div className="flex items-center">Threshold {getSortIcon("threshold_stock_value")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("expiry_date")}>
                  <div className="flex items-center">Expiry {getSortIcon("expiry_date")}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("supplier_name")}>
                  <div className="flex items-center">Supplier {getSortIcon("supplier_name")}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMeds.map((med) => (
                <TableRow key={med.id}>
                  <TableCell>{med.name}</TableCell>
                  <TableCell>{med.category}</TableCell>
                  <TableCell>{getStockBadge(med.stock_value ?? 0, med.threshold_stock_value)}</TableCell>
                  <TableCell>{med.stock_value}</TableCell>
                  <TableCell>{med.threshold_stock_value ?? '-'}</TableCell>
                  <TableCell>{med.expiry_date}</TableCell>
                  <TableCell>{med.supplier_name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(med)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(med.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <div className="flex items-center justify-between py-4">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page + 1 >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
      <AddMedicationDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      <EditMedicationDialog
        medication={editingMed}
        open={!!editingMed}
        onOpenChange={(open) => !open && setEditingMed(null)}
      />
    </Card>
  );
}
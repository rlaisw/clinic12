"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/types";
import { useDeletePatient } from "@/hooks/use-patients";
import { EditPatientModal } from "@/components/patients/edit-patient-modal";
import { PencilIcon, TrashIcon, ArrowUpDownIcon } from "lucide-react";

interface PatientTableProps {
  patients: Patient[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  doctorView?: boolean;
}

export function PatientTable({ patients, sortBy, sortOrder, onSort, doctorView }: PatientTableProps) {
  const deletePatient = useDeletePatient();
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const totalPages = Math.ceil(patients.length / PAGE_SIZE);
  const paginatedPatients = patients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this patient?")) {
      deletePatient.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead>
      {onSort ? (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 p-0"
          onClick={() => onSort(field)}
        >
          {label}
          <ArrowUpDownIcon className={`h-3 w-3 ${sortBy === field ? 'opacity-100' : 'opacity-50'}`} />
        </Button>
      ) : (
        label
      )}
    </TableHead>
  );

  return (
    <>
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="first_name" label="Name" />
              <SortableHeader field="hkid" label="HKID" />
              <SortableHeader field="date_of_birth" label="Date of Birth" />
              <SortableHeader field="gender" label="Gender" />
              <SortableHeader field="phone" label="Phone" />
              <SortableHeader field="email" label="Email" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No patients found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPatients.map((patientItem) => {
                const patientLink = doctorView 
                  ? `/doctor/patients/${patientItem.id}` 
                  : `/patients/${patientItem.id}`;
                return (
                  <TableRow key={patientItem.id}>
                    <TableCell>
                      <Link
                        href={patientLink}
                        className="font-medium hover:underline"
                      >
                        {patientItem.first_name} {patientItem.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{patientItem.hkid || "—"}</TableCell>
                    <TableCell>{formatDate(patientItem.date_of_birth)}</TableCell>
                    <TableCell>{patientItem.gender === "M" ? "Male" : "Female"}</TableCell>
                    <TableCell>{patientItem.phone}</TableCell>
                    <TableCell>{patientItem.email || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPatient(patientItem)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(patientItem.id)}
                          disabled={deletePatient.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
</TableBody>
          </Table>
        </div>
       <EditPatientModal
         patient={editingPatient}
         open={!!editingPatient}
         onOpenChange={(open) => !open && setEditingPatient(null)}
       />
    </>
  );
}
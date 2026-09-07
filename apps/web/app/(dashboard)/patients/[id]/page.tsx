"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/hooks/use-patients";
import { EditPatientModal } from "@/components/patients/edit-patient-modal";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: patient, isLoading, error } = usePatient(id);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-sm text-red-500">
        Failed to load patient. <Link href="/patients" className="underline">Go back</Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/patients">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">
            {patient.first_name} {patient.last_name}
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(true)}>
          <PencilIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth</span>
              <span>{formatDate(patient.date_of_birth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender</span>
              <span>{patient.gender === "M" ? "Male" : "Female"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{patient.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{patient.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span>{patient.address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blood Type</span>
              <span>{patient.blood_type || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allergies</span>
              <span>{patient.allergies || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.emergency_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts.</p>
            ) : (
              <div className="space-y-2">
                {patient.emergency_contacts.map((contact) => (
                  <div key={contact.id} className="rounded-md border p-2 text-sm">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-muted-foreground">{contact.relationship} — {contact.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical History</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.medical_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medical history recorded.</p>
          ) : (
            <div className="space-y-2">
              {patient.medical_history.map((history) => (
                <div key={history.id} className="rounded-md border p-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{history.condition}</span>
                    <span className="text-muted-foreground">{formatDate(history.diagnosis_date)}</span>
                  </div>
                  <div className="text-muted-foreground">{history.notes || "No notes"}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditPatientModal
        patient={patient}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}
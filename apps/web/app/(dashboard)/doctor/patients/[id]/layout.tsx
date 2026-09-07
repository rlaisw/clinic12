"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientBackgroundForm } from "@/components/doctor/patient-background-form";
import { MedicationHistoryTabs } from "@/components/doctor/medication-history-tabs";
import { DataVisualizationTab } from "@/components/doctor/data-visualization-tabs";
import { PrescriptionTabs } from "@/components/doctor/prescription-tabs";
import { SickLeaveCertificateTabs } from "@/components/doctor/sick-leave-certificate-tabs";
import { ReceiptTabs } from "@/components/doctor/receipt-tabs";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";

export default function DoctorPatientLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;
  const { role, isLoading } = useUser();
  const isDoctor = role === "doctor";

  if (!isLoading && !isDoctor) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Access denied. This page is for doctors only.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentTab = pathname.includes("/medications")
    ? "medications"
    : pathname.includes("/data-visualization")
      ? "data-visualization"
      : pathname.includes("/prescriptions")
        ? "prescriptions"
        : pathname.includes("/sick-leave-certificate")
          ? "sick-leave-certificate"
          : pathname.includes("/receipt")
            ? "receipt"
            : pathname.includes("/ai-chatbot")
              ? "ai-chatbot"
              : "profile";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Patient Overview</h1>
        <Link href="/doctor/patients" className="text-sm text-blue-600 hover:underline">
          Back to Patients
        </Link>
      </div>

      <div className="border-b">
        <nav className="flex space-x-4" aria-label="Tabs">
          <Link
            href={`/doctor/patients/${id}`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Profile & Background
          </Link>
          <Link
            href={`/doctor/patients/${id}/medications`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "medications"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Medication History
          </Link>
          <Link
            href={`/doctor/patients/${id}/data-visualization`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "data-visualization"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Data Visualization
          </Link>
          <Link
            href={`/doctor/patients/${id}/prescriptions`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "prescriptions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Prescription
          </Link>
          <Link
            href={`/doctor/patients/${id}/receipt`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "receipt"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Receipt
          </Link>
          <Link
            href={`/doctor/patients/${id}/sick-leave-certificate`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "sick-leave-certificate"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Sick Leave Certificate
          </Link>
          <Link
            href={`/doctor/patients/${id}/ai-chatbot`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2",
              currentTab === "ai-chatbot"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            AI Chatbot
          </Link>
        </nav>
      </div>

      {currentTab === "profile" && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientBackgroundForm patientId={id} disabled={!isDoctor} />
            </CardContent>
          </Card>
        </div>
      )}

      {currentTab === "medications" && (
        <div className="mt-4">
          <MedicationHistoryTabs patientId={id} disabled={!isDoctor} />
        </div>
      )}

      {currentTab === "data-visualization" && (
        <div className="mt-4">
          <DataVisualizationTab patientId={id} />
        </div>
      )}

      {currentTab === "prescriptions" && (
        <div className="mt-4">
          <PrescriptionTabs patientId={id} disabled={!isDoctor} />
        </div>
      )}

      {currentTab === "receipt" && (
        <div className="mt-4">
          <ReceiptTabs patientId={id} disabled={!isDoctor} />
        </div>
      )}

      {currentTab === "sick-leave-certificate" && (
        <div className="mt-4">
          <SickLeaveCertificateTabs patientId={id} disabled={!isDoctor} />
        </div>
      )}

      {currentTab === "ai-chatbot" && (
        <div className="mt-4">
          <iframe
            src="https://kilo.clinic.com.hk/chat/CwuSNzcg0bsrG2lY"
            className="w-full h-[80vh] border rounded"
            title="AI Chatbot"
          />
        </div>
      )}
    </div>
  );
}
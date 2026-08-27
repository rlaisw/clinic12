"use client";

import { useParams } from "next/navigation";
import { ReceiptTabs } from "@/components/doctor/receipt-tabs";

export default function DoctorPatientReceiptPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Receipt</h1>
      <ReceiptTabs patientId={id} disabled={false} />
    </div>
  );
}
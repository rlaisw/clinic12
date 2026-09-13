"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatients } from "@/hooks/use-patients";
import { useUser } from "@/contexts/user-context";
import { Activity, UserPlusIcon } from "lucide-react";

export default function DoctorPatientsPage() {
  return <DoctorPatientsPageContent />;
}

function DoctorPatientsPageContent() {
  const { role, isLoading } = useUser();
  const isDoctor = role === "doctor";
  const router = useRouter();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [hkid, setHkid] = useState<string>("");
  const [selectedPatientObj, setSelectedPatientObj] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    hkid?: string;
  } | null>(null);
  const { data: patients = [] } = usePatients();

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPatientId(id);
    setHkid("");
    const patient = patients.find((p) => String(p.id) === id) || null;
    setSelectedPatientObj(patient || null);
    if (patient) {
      setHkid(patient.hkid || "");
    }
  };

  const handleHkidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHkid(value);
    if (value) {
      const patient = patients.find((p) =>
        p.hkid && p.hkid.toLowerCase().includes(value.toLowerCase())
      ) || null;
      if (patient) {
        setSelectedPatientId(String(patient.id));
        setSelectedPatientObj(patient);
      } else {
        setSelectedPatientId("");
        setSelectedPatientObj(null);
      }
    } else {
      setSelectedPatientId("");
      setSelectedPatientObj(null);
    }
  };

  const handleViewPatient = () => {
    if (selectedPatientObj) {
      router.push(`/doctor/patients/${selectedPatientObj.id}`);
    }
  };

  if (!isLoading && !isDoctor) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Access denied. This page is for doctors only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Patient Overview</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a patient by name or HKID to view their medical records and history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <UserPlusIcon className="h-4 w-4" />
            Select Patient
          </CardTitle>
          <CardDescription>
            Choose a patient to view their profile, background, and medication history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Patient *</label>
            <Select value={selectedPatientId} onChange={handlePatientChange}>
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">HKID</label>
            <Input
              type="text"
              placeholder="Or enter HKID..."
              value={hkid}
              onChange={handleHkidChange}
            />
            {selectedPatientObj && hkid && (
              <p className="text-xs text-muted-foreground">
                {selectedPatientObj.first_name} {selectedPatientObj.last_name}
              </p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleViewPatient}
            disabled={!selectedPatientObj}
          >
            <UserPlusIcon className="h-3.5 w-3.5 mr-1" />
            View Patient Records
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
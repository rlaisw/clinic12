"use client";

import * as React from "react";
import { useUser } from "@/contexts/user-context";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { PatientSelectionDialog } from "@/components/doctor/patient-selection-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  BookOpenIcon,
  Settings2Icon,
  HeartPulseIcon,
  UsersIcon,
  ListOrderedIcon,
  UserIcon,
  BotIcon,
} from "lucide-react";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Dr. Wong",
      logo: <GalleryVerticalEndIcon />,
      plan: "Clinic",
    },
    {
      name: "Dr. Lai",
      logo: <AudioLinesIcon />,
      plan: "Clinic",
    },
  ],
  navMain: [
    {
      title: "Patient Queue",
      url: "/patient-queue",
      icon: <ListOrderedIcon />,
      items: [
        { title: "Queue Dashboard", url: "/patient-queue" },
      ],
    },
    {
      title: "Medication",
      url: "/medications",
      icon: <HeartPulseIcon />,
      items: [
        { title: "All Medications", url: "/medications/all" },
        { title: "Add Medication", url: "/medications/add" },
        { title: "Medication Inventory Status", url: "/inventory-chart" },
        { title: "Out of Stock Medications", url: "/inventory-bar-chart" },
      ],
    },
    {
      title: "Patients",
      url: "/patients",
      icon: <UsersIcon className="h-4 w-4 text-black" />,
      items: [
        { title: "All Patients", url: "/patients" },
        { title: "Add Patient", url: "/patients?openCreateModal=true" },
      ],
    },
    {
      title: "AI Chatbot",
      url: "/ai-chatbot",
      icon: <BotIcon />,
      items: [],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ],
  projects: [
    {
      name: "Documentation",
      url: "#",
      icon: <BookOpenIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role, isLoading } = useUser();
  const isDoctor = role === "doctor";
  const [patientDialogOpen, setPatientDialogOpen] = React.useState(false);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {!isLoading && isDoctor && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Patient Overview"
                  onClick={() => setPatientDialogOpen(true)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Patient Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <PatientSelectionDialog
              open={patientDialogOpen}
              onOpenChange={setPatientDialogOpen}
            />
          </>
        )}
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
# Clinic12 - User Guide

## Overview
Clinic12 is the clinic's medication and patient management system. It covers medication inventory, patient records, prescriptions, receipts, sick-leave certificates, and an AI chatbot — all behind a doctor/nurse role-based login at `https://vps.tailb5775.ts.net/`.

## Quick Start

### 1. Log In
Open `https://vps.tailb5775.ts.net/` and sign in with your clinic account (e.g. `doctor` / `doctor1997` for the doctor account). Doctors get access to the patient dashboard tabs; staff roles see the views granted to their role.

### 2. Main Sections
- **Patient Queue**: `/patient-queue` — today's queue overview
- **Medication Inventory**: `/medications` — catalog, stock levels, and alerts
- **Patients**: `/doctor/patients` — patient list; open a patient to see their dashboard
- **AI Chatbot**: inside a patient's dashboard → **AI Chatbot** tab (doctor role)

### 3. Key Features
- **Real-time stock tracking** with automatic alerts
- **Expiry date monitoring** with configurable thresholds
- **Supplier management** with contact integration
- **Patient records** with prescription, receipt, and sick-leave history
- **AI chatbot** for doctor-assisted patient/medication queries

## Patient Dashboard Tabs

Each patient page (`/doctor/patients/{id}`) has tabs:

| Tab | Route | Purpose |
|---|---|---|
| Profile & Background | `.../{id}` | Patient demographics, background form |
| Medication History | `.../{id}/medications` | Prescriptions, medication history |
| Data Visualization | `.../{id}/data-visualization` | Charts of the patient's data |
| Prescription | `.../{id}/prescriptions` | Create/manage prescriptions |
| Receipt | `.../{id}/receipt` | Receipts with PDF + QR |
| Sick Leave Certificate | `.../{id}/sick-leave-certificate` | Certificate docs with QR verification |
| AI Chatbot | `.../{id}/ai-chatbot` | Dify-powered clinical assistant |

## Medication Inventory Management

### Adding a New Medication

1. Navigate to "Add New Medication" (`/medications/add`)
2. Fill in required fields:
   - **Name**: Medication name (e.g., "Paracetamol 500mg")
   - **Category**: Select from dropdown (e.g., "Analgesic", "Antibiotic")
   - **Dosage**: Specify strength (e.g., "5mg", "10mg/5ml")
   - **Administration Route**: How medication is administered
   - **Stock Information**: Current quantity, minimum/maximum levels
   - **Supplier Details**: Contact information for restocking
3. Click "Save Medication"

### Managing Existing Medications

#### View Details
- Open the Medication History tab for a patient, or browse the medication catalog
- See stock status, expiry date, supplier contacts
- View inventory history (stock changes over time)

#### Update Information
- Click "Edit" on medication details page
- Modify dosage, stock levels, supplier information
- Changes are automatically tracked in inventory history

#### Delete Medications
- Use "Delete" button (requires confirmation)
- Soft deletes medication (can be restored if needed)

## Stock Management

### Stock Status Indicators

- **🟢 NORMAL_STOCK**: Stock levels within normal range
- **🟡 LOW_STOCK**: Stock below minimum threshold
- **🔴 OUT_OF_STOCK**: No inventory available
- **🟠 EXPIRING_SOON**: Expires within 30 days
- **🔵 HIGH_STOCK**: Stock exceeds 80% of maximum

### Stock Value Tracking

- **Unit Cost**: Cost per unit of medication
- **Total Value**: Automatic calculation (stock × unit cost)
- **Inventory Valuation**: Real-time total clinic inventory value

## AI Chatbot

The **AI Chatbot** tab opens the Dify-powered assistant inside the patient dashboard. It answers questions about the patient from the clinic database (prescriptions, medications, history) and can format replies as tables.

- Type in the 4-row text box and press **Enter** to send.
- Press **Shift+Enter** to insert a new line without sending.
- Example questions: *"List all medications for this patient"*, *"Show recent prescriptions"*.

If the service is slow (large table answers can legitimately take a minute or two), please wait for the reply instead of resending.

## Troubleshooting

### Common Issues

**Can't reach the site**
- Verify the server is up: `bash start-all.sh status`
- Open the Tailscale funnel URL `https://vps.tailb5775.ts.net/` and accept the self-signed certificate if prompted
- Clear browser cache or use a private window

**Alert Not Triggering**
- Verify stock levels are below threshold
- Check medication is marked as active
- Confirm alerts are enabled in settings

**Incorrect Stock Value**
- Recalculate: `stock_value × unit_cost = total_value`
- Update stock after dispensing
- Verify unit cost is current

**Dashboard Not Loading**
- Check internet connection
- Verify API endpoints are accessible
- Clear browser cache

### Contact Support
For technical issues, contact the clinic system administrator.

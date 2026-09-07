# Quickstart: Create Sick Leave Improvement

## Prerequisites

- Python 3.14 with Django 6.0.6
- Node.js with pnpm
- PostgreSQL (or SQLite for dev)

## Setup

1. **Start the development environment**:
   ```powershell
   .\start-dev.ps1 clinic1
   ```

2. **Apply database migrations**:
   ```bash
   cd backend
   python manage.py migrate
   ```

3. **Start the frontend** (if not already running):
   ```bash
   pnpm --filter web dev
   ```

## Testing the Feature

### 1. SREF Preview

After implementing the SREF preview endpoint:

```bash
# Get a preview SREF (requires authentication)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/sref-preview/
```

Expected response:
```json
{
  "sref": "S001-0000-0001-0001"
}
```

### 2. Create Certificate with Remarks

```bash
# Create a certificate with remarks
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "patient-uuid",
    "consultation_details": "Patient presents with fever and sore throat",
    "diagnosis": "Viral upper respiratory infection",
    "recommended_sick_leave": "3 days",
    "remarks": "Patient advised to rest and hydrate"
  }' \
  http://localhost:8000/api/patients/{patient-id}/sick-leave-certificates/
```

### 3. Verify Remarks in Response

The response should include the remarks field:
```json
{
  "id": "uuid",
  "reference_number": "S001-0000-0001-0001",
  "remarks": "Patient advised to rest and hydrate",
  ...
}
```

### 4. Frontend Verification

1. Navigate to: `https://kilo.clinic.com.hk/doctor/patients/[patient-id]/sick-leave-certificate`
2. Verify the SREF is displayed on the create screen
3. Fill in the form including the Remarks field
4. Click "Sign & Issue"
5. Verify the certificate is created successfully

## Running Tests

```bash
# Backend tests
cd backend
python -m pytest api/tests.py -v

# Frontend tests
pnpm --filter web test
```

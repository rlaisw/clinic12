# Quickstart: Validate Receipt Preview Fix

Runnable validation for the receipt PDF preview restoration. Implements the P1/P2 user stories end-to-end.

## Prerequisites

- Backend venv with dependencies: `backend/venv/bin/pip install -r backend/requirements.txt` (after adding `PyMuPDF`)
- Django running: `bash start-dev.sh` (or backend only: `cd backend && venv/bin/python manage.py runserver 0.0.0.0:8000`)
- Public host env var set for correct QR URLs:
  `export FRONTEND_BASE_URL=https://vps.tailb5775.ts.net` (in `backend/.env`)
- A patient with at least one receipt in the DB (`Receipt.objects.exists()`)

## Validation Scenarios

### VS-1: PDF endpoint returns 200 (was 500) — user story P1

```bash
# Get a receipt id (doctor token required)
TOKEN=<doctor-token>
RID=$(curl -sk https://vps.tailb5775.ts.net/api/receipts/ -H "Authorization: Token $TOKEN" | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')
curl -sk -o /tmp/receipt.pdf -w "%{http_code}\n" \
  -H "Authorization: Token $TOKEN" \
  https://vps.tailb5775.ts.net/api/receipts/$RID/pdf/
# Expect: 200 and a valid PDF
file /tmp/receipt.pdf   # → "PDF document"
```

**Regression test** (runs in CI): `backend/api/tests.py` — `GET /api/receipts/{id}/pdf/` with a doctor token returns 200 and `application/pdf` content type. Fails if `fitz` breaks the import again.

### VS-2: Receipt Preview modal renders in the UI — user story P1

1. Open `https://vps.tailb5775.ts.net/doctor/patients/{id}/receipt` as doctor.
2. Click **Receipt Preview** on an existing receipt row.
3. Expect: modal opens showing the PDF (no "Request failed with status code 500").

### VS-3: QR verification URL uses public host — user story P2 / SC-004

```bash
# Extract the QR link from the generated PDF (fit-based inspection)
backend/venv/bin/python - <<'PY'
import fitz
doc = fitz.open('/tmp/receipt.pdf')
page = doc[0]
# The verify URL is embedded in the QR image content; with fitz open the
# crypto/annotations or render the QR. Simplest check: open the produced PDF
# and confirm 'verify-receipt' appears in any text/URI annotation.
for link in page.get_links():
    print(link.get('uri'))
PY
# Expect: a URI containing https://vps.tailb5775.ts.net/verify-receipt/<token>/
```

Alternative end-to-end: scan the QR with a phone camera → it must open the verification page at the public host, not `localhost`.

### VS-4: Certificate module still works (shared dependency)

```bash
curl -sk -o /tmp/slc.pdf -w "%{http_code}\n" \
  -H "Authorization: Token $TOKEN" \
  https://vps.tailb5775.ts.net/api/sick-leave-certificates/<id>/pdf/ 2>/dev/null || true
# Expect: 200 (same fitz dependency now satisfied)
```

## Expected Outcomes

| Scenario | Before fix | After fix |
|---|---|---|
| VS-1 PDF endpoint | 500 `No module named 'fitz'` | 200 valid PDF |
| VS-2 UI preview | error banner | PDF modal renders |
| VS-3 QR host | `localhost:3001` (wrong) | public host URL |
| VS-4 certificate PDF | 500 (same cause) | 200 |

## References

- Endpoint behavior: [contracts/pdf-endpoint.md](contracts/pdf-endpoint.md)
- Entities: [data-model.md](data-model.md)
- No data migration required.
# Data Model: CocoIndex + LanceDB RAG

## Overview
Two embedded databases (CocoIndex pipeline state, LanceDB vector storage) plus metadata-only SQLite for file tracking. No new application SQLite — all source data lives in the existing `backend/db.sqlite3`.

## LanceDB Schema

### Table: text_embeddings
Stores text chunks with their vector embeddings for semantic search.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID, unique chunk identifier |
| text | string | The text content of the chunk |
| embedding | float32[384] | Vector embedding from all-MiniLM-L6-v2 |
| source_type | string | Table name: api_patient, api_sickleavecertificate, etc. |
| source_id | integer | Primary key of the source row |
| source_field | string | Column name the text came from |
| patient_id | integer | FK to api_patient (if applicable) |
| created_at | string | ISO timestamp of indexing |

### Table: image_embeddings (future)
| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| image_hash | string | MD5 of image file |
| embedding | float32[512] | Image embedding |
| source_path | string | Path in data/files/images/ |
| created_at | string | ISO timestamp |

## CocoIndex Pipeline State (filesystem)

```
coco_state/
├── file_hashes.txt       # MD5 hashes of processed files
└── index_state.json      # Last indexed row IDs per table
```

## Metadata Tracking (existing SQLite is reused)
No new SQLite database. The `django_migrations` table tracks schema version.  
The existing DB tables are read-only from CocoIndex's perspective.

## Entity Relationships (source data)
```
api_patient (1) ──┬── (N) api_sickleavecertificate
                  ├── (N) api_receipt
                  ├── (N) api_patientbackground
                  ├── (N) api_medicalhistory
                  ├── (N) api_prescriptionmedication
                  ├── (N) api_activemedication
                  ├── (N) api_allergy
                  └── (N) api_queueentry
```

## Indexing Strategy
| Table | Concatenation Pattern | Priority |
|-------|----------------------|----------|
| api_patient | `"Patient {first_name} {last_name}, HKID: {hkid}, DOB: {date_of_birth}, Phone: {phone}"` | High |
| api_sickleavecertificate | Full record as searchable text | High |
| api_receipt | Financial + diagnosis text | High |
| api_patientbackground | Chief complaint + history combined | Medium |
| api_medicalhistory | Condition + diagnosis date + notes | Medium |
| api_prescriptionmedication | Medication name + dosage + frequency | Medium |
| api_allergy | Substance + reaction + severity | Low |
"""
CocoIndex Pipeline: Extract → Chunk → Embed → Store
Reads from existing clinic SQLite, processes files, writes to LanceDB.
No new SQLite database created.
"""
import os
import sys
import hashlib
import json
import sqlite3
from pathlib import Path

import lancedb
import pyarrow as pa

sys.path.insert(0, os.path.dirname(__file__))
from rag_engine import init_lancedb, get_or_create_text_table
from sentence_transformers import SentenceTransformer

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "db.sqlite3")
STATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "coco_state")
STATE_FILE = os.path.join(STATE_DIR, "index_state.json")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "files")

os.makedirs(STATE_DIR, exist_ok=True)

MODEL = None
def get_model():
    global MODEL
    if MODEL is None:
        MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return MODEL


def get_clinic_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Extraction strategies per table ──────────────────────────────────

TABLE_EXTRACTORS = [
    {
        "table": "api_patient",
        "source_type": "patient",
        "id_column": "id",
        "chunk": lambda r: f"Patient: {r['first_name']} {r['last_name']}, HKID: {r['hkid']}, DOB: {r['date_of_birth']}, Phone: {r['phone']}, Address: {r['address']}",
    },
    {
        "table": "api_sickleavecertificate",
        "source_type": "sick_leave_certificate",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Sick Leave Certificate - Patient: {r['patient_name']}, Diagnosis: {r['diagnosis']}, Consultation: {r['consultation_details']}, Sick Leave: {r['recommended_sick_leave']}, Issue: {r['issue_date']}, Expiry: {r['expiry_date']}, Remarks: {r['remarks'] or ''}",
    },
    {
        "table": "api_receipt",
        "source_type": "receipt",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Receipt - Patient: {r['patient_name']}, Diagnosis: {r['diagnosis']}, Consultation: {r['consultation']}, Medications: {r['medications']}, Total: {r['total_free']} ({r['total_dollars']}), Date: {r['date']}",
    },
    {
        "table": "api_patientbackground",
        "source_type": "patient_background",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Patient Background - Chief Complaint: {r['chief_complaint'] or ''}, Past Medical History: {r['past_medical_history'] or ''}, Social/Family: {r['social_family_history'] or ''}, Occupation: {r['occupation'] or ''}",
    },
    {
        "table": "api_medicalhistory",
        "source_type": "medical_history",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Medical History - Condition: {r['condition']}, Diagnosed: {r['diagnosis_date'] or ''}, Notes: {r['notes'] or ''}",
    },
    {
        "table": "api_prescriptionmedication",
        "source_type": "prescription",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Prescription - Medication: {r['medication_name']}, Dosage: {r['dosage_amount']} {r['dosage_unit']}, Route: {r['route']}, Frequency: {r['frequency']}, Start: {r['start_date'] or ''}, End: {r['end_date'] or ''}",
    },
    {
        "table": "api_allergy",
        "source_type": "allergy",
        "id_column": "id",
        "patient_column": "patient_id",
        "chunk": lambda r: f"Allergy - Substance: {r['substance']}, Reaction: {r['reaction']}, Severity: {r['severity']}",
    },
]


def extract_and_index(conn: sqlite3.Connection, text_table, state: dict, model) -> int:
    total = 0
    for cfg in TABLE_EXTRACTORS:
        table_name = cfg["table"]
        source_type = cfg["source_type"]
        id_col = cfg["id_column"]
        patient_col = cfg.get("patient_column")
        added_ids = state.setdefault(table_name, {"added": []})
        already_added = set(added_ids.get("added", []))

        rows = conn.execute(f"SELECT * FROM {table_name}").fetchall()
        if not rows:
            continue

        data = []
        for row in rows:
            rid = str(row[id_col])
            if rid in already_added:
                continue
            text = cfg["chunk"](row)
            embedding = model.encode(text).tolist()
            record = {
                "id": f"{source_type}_{rid}",
                "text": text,
                "source": "clinic_db",
                "source_id": rid,
                "source_type": source_type,
                "patient_id": str(row[patient_col]) if patient_col and row[patient_col] else "",
                "embedding": embedding,
            }
            data.append(record)
            already_added.add(rid)

        if data:
            text_table.add(data)
            added_ids["added"] = list(already_added)
            total += len(data)

    return total


def process_file_directory(text_table, state: dict, model) -> int:
    files_state = state.setdefault("files", {"processed": {}})
    data = []
    for root, dirs, fnames in os.walk(DATA_DIR):
        for fname in fnames:
            if fname.startswith("."):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, "rb") as f:
                fhash = hashlib.md5(f.read()).hexdigest()
            if files_state["processed"].get(fpath) == fhash:
                continue
            text = f"File: {fname}, Path: {fpath}"
            try:
                content = open(fpath, "r", errors="ignore").read(2000)
                text = f"File: {fname}\nContent preview: {content[:1000]}"
            except:
                pass
            embedding = model.encode(text).tolist()
            data.append({
                "id": f"file_{hashlib.md5(fpath.encode()).hexdigest()}",
                "text": text,
                "source": "file_system",
                "source_id": fpath,
                "source_type": "uploaded_file",
                "patient_id": "",
                "embedding": embedding,
            })
            files_state["processed"][fpath] = fhash
    if data:
        text_table.add(data)
    return len(data)


def run_pipeline() -> int:
    model = get_model()
    conn = get_clinic_db()
    db = init_lancedb()
    text_table = get_or_create_text_table(db)

    state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            state = json.load(f)

    db_count = extract_and_index(conn, text_table, state, model)
    file_count = process_file_directory(text_table, state, model)

    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

    conn.close()
    return db_count + file_count


if __name__ == "__main__":
    count = run_pipeline()
    print(f"Indexed {count} records into LanceDB")
    print(f"Source: existing clinic DB at {DB_PATH}")
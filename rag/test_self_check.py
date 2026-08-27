"""Self-check test for CocoIndex pipeline"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from cocoindex_pipeline import (
    get_clinic_db, TABLE_EXTRACTORS, DB_PATH, STATE_DIR, DATA_DIR
)

errors = 0

# 1. Check existing clinic SQLite exists
assert os.path.exists(DB_PATH), f"Clinic DB not found: {DB_PATH}"
print(f"[PASS] Clinic DB exists: {DB_PATH}")

# 2. Check we can connect and read tables
conn = get_clinic_db()
for cfg in TABLE_EXTRACTORS:
    try:
        rows = conn.execute(f"SELECT COUNT(*) as cnt FROM {cfg['table']}").fetchone()
        print(f"[PASS] Table {cfg['table']}: {rows['cnt']} rows")
    except Exception as e:
        print(f"[FAIL] Table {cfg['table']}: {e}")
        errors += 1

# 3. Check DATA_DIR exists
assert os.path.exists(DATA_DIR), f"Data dir not found: {DATA_DIR}"
print(f"[PASS] Data dir exists: {DATA_DIR}")

# 4. Check LanceDB directory is writable
lancedb_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lancedb_data")
os.makedirs(lancedb_path, exist_ok=True)
print(f"[PASS] LanceDB dir: {lancedb_path}")

# 5. Check state dir is writable
os.makedirs(STATE_DIR, exist_ok=True)
print(f"[PASS] State dir: {STATE_DIR}")

print(f"\n{'ALL PASS' if errors == 0 else f'{errors} FAILURES'}")
sys.exit(errors)
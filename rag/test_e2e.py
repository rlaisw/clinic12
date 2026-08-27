"""End-to-end test: fresh index -> query -> verify"""
import sys, os, json, time, shutil
sys.path.insert(0, os.path.dirname(__file__))
from cocoindex_pipeline import run_pipeline, STATE_DIR
from rag_engine import init_lancedb

state_file = os.path.join(STATE_DIR, "index_state.json")
if os.path.exists(state_file):
    os.remove(state_file)
lancedb_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lancedb_data", "text_embeddings.lance")
if os.path.exists(lancedb_path):
    shutil.rmtree(lancedb_path)

errors = 0

print("=== Step 1: CocoIndex Pipeline ===")
count = run_pipeline()
assert count > 0, f"Pipeline indexed 0 records"
print(f"[PASS] Indexed {count} records")

print("\n=== Step 2: LanceDB Verification ===")
db = init_lancedb()
table = db.open_table("text_embeddings")
n_rows = table.count_rows()
assert n_rows > 0, f"LanceDB has 0 rows"
print(f"[PASS] LanceDB has {n_rows} rows")

print("\n=== Step 3: Semantic Search ===")
from sentence_transformers import SentenceTransformer
from rag_engine import search
model = SentenceTransformer("all-MiniLM-L6-v2")
queries = ["patient with fever", "medication prescription", "receipt and diagnosis"]
for q in queries:
    start = time.time()
    emb = model.encode(q).tolist()
    results = search(emb, top_k=3)
    elapsed = time.time() - start
    assert len(results) > 0, f"No results for: {q}"
    print(f"[PASS] '{q}' -> {len(results)} results in {elapsed*1000:.0f}ms")

print("\n=== Step 4: Source Type Coverage ===")
source_types = set(r["source_type"] for r in search(model.encode("medical").tolist(), top_k=50))
found = source_types & {"patient", "sick_leave_certificate", "receipt", "patient_background", "medical_history", "prescription", "allergy"}
print(f"[INFO] Source types found: {sorted(found)}")
assert len(found) >= 3, f"Expected >=3 source types, got {len(found)}"
print(f"[PASS] Multiple source types indexed ({len(found)} types)")

print("\n=== Step 5: API Integration ===")
import urllib.request
import json as j
h = urllib.request.urlopen("http://localhost:8001/health")
assert j.load(h) == {"status": "ok"}, "Health check failed"
print(f"[PASS] API health check")

body = j.dumps({"query": "test", "top_k": 2}).encode()
req = urllib.request.Request("http://localhost:8001/query", data=body, headers={"Content-Type": "application/json"}, method="POST")
data = j.load(urllib.request.urlopen(req))
assert data["total"] > 0, "API query returned 0 results"
assert "embedding" not in data["results"][0], "Embedding leaking in API response"
print(f"[PASS] API query returns {data['total']} results (embeddings stripped)")

print("\n=== Step 6: Reindex ===")
body = j.dumps({}).encode()
req = urllib.request.Request("http://localhost:8001/reindex", data=body, headers={"Content-Type": "application/json"}, method="POST")
rdata = j.load(urllib.request.urlopen(req))
assert rdata["status"] == "ok"
print(f"[PASS] Reindex: {rdata}")

print(f"\n{'ALL PASS' if errors == 0 else str(errors) + ' FAILURES'}")
sys.exit(errors)
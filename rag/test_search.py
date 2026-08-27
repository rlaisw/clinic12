import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from sentence_transformers import SentenceTransformer
from rag_engine import search

model = SentenceTransformer("all-MiniLM-L6-v2")
query = sys.argv[1] if len(sys.argv) > 1 else "patient with fever"
emb = model.encode(query).tolist()
results = search(emb, top_k=5)
for r in results:
    print(f"[{r['source_type']}] {r['text'][:120]}")
print(f"\nTotal: {len(results)} results for: {query}")
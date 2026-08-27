from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys, os
from sentence_transformers import SentenceTransformer

sys.path.insert(0, os.path.dirname(__file__))
from rag_engine import search
from cocoindex_pipeline import run_pipeline

app = FastAPI(title="Clinic RAG API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = SentenceTransformer("all-MiniLM-L6-v2")


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5


class QueryResponse(BaseModel):
    results: list[dict]
    total: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query_rag(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    emb = MODEL.encode(req.query).tolist()
    results = search(emb, req.top_k)
    cleaned = [{k: v for k, v in r.items() if k != "embedding"} for r in results]
    return QueryResponse(results=cleaned, total=len(cleaned))


@app.post("/reindex")
def reindex():
    try:
        count = run_pipeline()
        return {"status": "ok", "records_indexed": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting Clinic RAG API on http://0.0.0.0:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
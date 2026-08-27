# Research Findings: Hybrid Router for SQLite Data Retrieval

## Decision: Query Classification Strategy
- **Chosen**: Hybrid Classification (BM25 + Intent Detection)
- **Rationale**: Provides both semantic understanding and structured intent recognition
- **Alternatives considered**:
  - Pure embedding-based classification: Too generic for medical queries
  - Rule-based classification: Hard to maintain for medical terminology
  - Text-to-SQL only: Cannot handle conversational queries effectively

## Decision: Session Storage Architecture
- **Chosen**: SQLite with TTL (Time-To-Live) approach
- **Rationale**: Leverages existing SQLite setup, provides persistence and auditability
- **Alternatives considered**:
  - Redis: Faster but requires new infrastructure
  - In-memory only: Loses conversation context on restart
  - No persistence: Cannot track patient-specific context

## Decision: SQL + Vector Integration
- **Chosen**: Always execute both, weighted merging
- **Rationale**: Maximizes retrieval accuracy, provides both structured and semantic results
- **Alternatives considered**:
  - Sequential fallback: Potential for biased results
  - Only SQL for structured queries: Misses semantic relationships
  - Only vector for unstructured: Misses exact patient matches

## Technology Recommendations
### Query Classification
- **Primary**: Sentence-BERT embeddings + BM25 ranking (from existing embeddings.py)
- **Secondary**: Simple rule-based categorization for high-confidence queries (patient IDs, specific conditions)

### Session Storage
- **Database Schema**: New `conversation_sessions` table in SQLite
- **TTL Implementation**: SQLite row expiration via scheduled cleanup job
- **Memory**: Python in-memory cache for active session contexts

### Hybrid Search Pipeline
- **SQL Branch**: Direct SQLite queries based on intent classification
- **Vector Branch**: Existing LanceDB search via search_context()
- **Result Fusion**: Weighted scoring combining both sources

## Key Implementation Insights
1. **Classification accuracy**: Target 90%+ with fallback to combined search
2. **Performance**: Classification < 200ms, hybrid search < 500ms total
3. **Medical terminology**: Requires domain-specific vocabulary enhancement
4. **Security**: Patient data access controlled via existing DoctorPermission

## Remaining Technical Questions
1. **Training data**: Where to source medical query classification training data?
2. **Schema design**: What specific schema fields are needed for conversation tracking?
3. **Performance monitoring**: How to track classification accuracy and search quality?
4. **Alerting**: What triggers should exist for classification failures?
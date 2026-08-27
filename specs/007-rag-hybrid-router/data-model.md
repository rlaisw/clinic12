# Data Model: Hybrid Router for SQLite Data Retrieval

## Core Entities

### Conversation Session
- **Purpose**: Tracks patient interaction context across multiple queries
- **Fields**:
  - `id` (UUID, PK)
  - `session_id` (string, unique) - Matches Dify session_id or generated UUID
  - `doctor_id` (FK to User)
  - `patient_id` (FK to Patient) - Current patient in context
  - `context_data` (JSON) - Serialized conversation state
  - `query_count` (integer) - Track session length (target: 10+)
  - `created_at` (datetime)
  - `last_query_at` (datetime)
  - `expires_at` (datetime) - For 7-day retention
  - `status` (enum: active, expired, cancelled)
- **Relationships**: One-to-many with `QueryLog`

### Query Log
- **Purpose**: Logs each query with classification and results
- **Fields**:
  - `id` (integer, PK)
  - `session_id` (FK to ConversationSession)
  - `query_text` (text) - User's exact question
  - `classification` (string) - Classified intent (patient_history, medication, etc.)
  - `classification_confidence` (float) - Classification certainty
  - `query_type` (enum: sql, vector, hybrid, fallback) - Routing decision
  - `sql_query` (text) - Generated SQL (if applicable)
  - `sql_results_count` (integer) - Number of SQL results
  - `vector_score` (float) - Best vector match score
  - `hybrid_score` (float) - Combined relevance score
  - `answer_text` (text) - AI response
  - `dify_session_id` (string, FK) - Dify conversation reference
  - `created_at` (datetime)
- **Relationships**: Belongs to `ConversationSession`

### Patient Context Cache
- **Purpose**: Cached patient data for fast retrieval
- **Fields**:
  - `patient_id` (FK to Patient, PK)
  - `session_contexts` (JSON) - Active session references
  - `active_medications` (JSON) - Current meds list
  - `last_query_time` (datetime) - When patient was last queried
  - `medical_history_summary` (text) - Brief condition summary
  - `updated_at` (datetime)
- **Relationships**: Many-to-one with `Patient`

### Query Classification Cache
- **Purpose**: Cache classified intents for performance
- **Fields**:
  - `id` (integer, PK)
  - `query_hash` (string) - Hash of query text
  - `classified_intent` (string) - Cached classification
  - `similarity_score` (float) - Similarity to known patterns
  - `training_examples` (JSON) - Example queries with same intent
  - `created_at` (datetime)

### Medical Knowledge Index
- **Purpose**: Stores structured medical knowledge for hybrid search
- **Fields**:
  - `id` (integer, PK)
  - `entity_type` (enum: condition, medication, procedure, symptom)
  - `entity_name` (string) - Standardized medical term
  - `description` (text) - Medical definition/description
  - `symptoms` (JSON) - Related symptoms
  - `treatments` (JSON) - Associated treatments
  - `severity_level` (integer) - Clinical severity
  - `medical_code` (string) - ICD/LOINC codes
  - `vector_embedding` (vector) - For LanceDB integration
  - `created_at` (datetime)

## Supporting Tables

### Session Cleanup Log
- **Purpose**: Track cleanup operations for 7-day retention
- **Fields**:
  - `id` (integer, PK)
  - `expired_session_ids` (JSON) - List of cleaned session IDs
  - `cleanup_timestamp` (datetime)
  - `records_deleted` (integer)

### Classification Performance Metrics
- **Purpose**: Track classifier accuracy and performance
- **Fields**:
  - `id` (integer, PK)
  - `date` (date) - Log date
  - `total_queries` (integer)
  - `correct_classifications` (integer)
  - `accuracy_percentage` (float)
  - `average_confidence` (float)
  - `fallback_count` (integer) - Queries requiring fallback logic

## Key Relationships

1. **Patient ↔ MedicalHistory**: One-to-many (patient's medical conditions)
2. **Patient ↔ ActiveMedication**: One-to-many (current medications)
3. **Patient ↔ PrescriptionMedication**: One-to-many (prescribed meds)
4. **Patient ↔ QueueEntry**: One-to-many (doctor visits)
5. **Patient ↔ Receipt**: One-to-many (receipts generated)
6. **Patient ↔ SickLeaveCertificate**: One-to-many (sick leave records)

7. **ConversationSession ↔ QueryLog**: One-to-many (query history)
8. **ConversationSession ↔ Dify**: One-to-one (Dify conversation mapping)
9. **PatientContextCache ↔ ConversationSession**: One-to-many (cached contexts)
10. **MedicalKnowledgeIndex ↔ VectorStore**: One-to-one (LanceDB integration)

## Validation Constraints

- **Foreign Keys**: All patient references must exist
- **Session Integrity**: Session count >= query count
- **Classification Accuracy**: Target >90% (tracked in metrics table)
- **Data Consistency**: Cache and live data synchronization
- **Security**: DoctorPermission enforcement on all accesses
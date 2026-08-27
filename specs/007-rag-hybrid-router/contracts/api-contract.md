# API Contract: Hybrid Router Interface

## Overview
This contract defines the public API endpoints for the hybrid router component that extends the RAG pipeline with stateful conversation memory and SQL+vector search capabilities.

## Endpoints

### POST /api/rag/hybrid-query
**Purpose**: Execute a hybrid query with conversation context awareness
**Authentication**: Requires DoctorPermission
**Content-Type**: application/json

#### Request
```json
{
  "query": "string (required)",
  "session_id": "string (optional, generated if not provided)",
  "top_k": "integer (optional, default: 5)",
  "context_limit": "integer (optional, default: 10)"
}
```

#### Response (200 OK)
```json
{
  "query": "string",
  "session_id": "string",
  "classification": "string (patient_history, medication_info, appointment_status, etc.)",
  "classification_confidence": "float (0.0-1.0)",
  "query_type": "string (sql, vector, hybrid, fallback)",
  "results": [
    {
      "patient_id": "integer",
      "source_type": "string (patient, medication, condition, etc.)",
      "text_content": "string",
      "score": "float (relevance score)",
      "metadata": "object (additional context)"
    }
  ],
  "sql_results": [
    {
      "patient_id": "integer",
      "data": "object (raw SQL result row)",
      "relevance_score": "float"
    }
  ],
  "vector_results": [
    {
      "patient_id": "integer",
      "text_content": "string",
      "similarity_score": "float"
    }
  ],
  "context_updated": {
    "query_count": "integer",
    "patient_context": "object (current patient focus)",
    "conversation_summary": "string"
  }
}
```

### GET /api/rag/session/{session_id}
**Purpose**: Retrieve conversation session context
**Authentication**: Requires DoctorPermission

#### Response (200 OK)
```json
{
  "session_id": "string",
  "doctor_id": "integer",
  "patient_id": "integer",
  "context_data": "object",
  "query_count": "integer",
  "created_at": "datetime",
  "last_query_at": "datetime",
  "expires_at": "datetime",
  "status": "string (active, expired, cancelled)",
  "recent_queries": [
    {
      "query": "string",
      "classification": "string",
      "timestamp": "datetime"
    }
  ]
}
```

### DELETE /api/rag/session/{session_id}
**Purpose**: Terminate a conversation session
**Authentication**: Requires DoctorPermission

#### Response (200 OK)
```json
{
  "success": "boolean",
  "message": "string",
  "deleted_at": "datetime"
}
```

## Error Responses
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: DoctorPermission required
- **404 Not Found**: Session not found
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Required services (SQLite, LanceDB) unavailable

## Rate Limits
- Maximum 30 requests per minute per doctor
- Burst limit: 5 requests per 10 seconds
- Exceeds limits return 429 Too Many Requests

## Versioning
- Current version: v1
- Backward compatibility guaranteed for minor versions
- Major version changes documented in release notes
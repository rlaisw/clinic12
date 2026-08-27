# Feature Specification: Hybrid Router for SQLite Data Retrieval

## Overview
Add a hybrid query router/classifier to the RAG pipeline to implement Stateful Conversation Memory. This will solve the issue of returning random patients by classifying user queries and retaining context between interactions.

## Actors
- **Doctor**: Logged-in user requesting patient data
- **Chatbot**: The interface through which requests are made
- **Database**: SQLite database storing patient information

## User Stories
### P1: Context-Aware Query Handling
- As a doctor, I want the chatbot to understand the context of my request so I get relevant patient data, not random results.
- When I ask about a specific patient's history, the system should recognize the context of previous queries.

### P2: Stateful Memory Implementation
- As a developer, I need to implement a query router that maintains conversation history.
- The system must track usersession context between multiple requests.

## Functional Requirements
### FR1: Query Classification
- The system must classify user queries into categories (e.g., "patient history", "medication info", "appointment status").
- Must use a classifier to route queries before RAG search.

### FR2: Schema Access
- The system must both introspect the SQLite database schema and support Text-to-SQL conversion.
- Schema exploration tools must be available for developers and users.

### FR3: Stateful Context Storage
- Maintain conversation context for at least 10 query interactions per session.
- Implement hybrid storage: short-term context in memory with periodic persistence to database.
- Database storage ensures reliability and auditability for clinical use.

### FR4: Hybrid Search Logic
- The system must always execute both SQL and vector searches.
- Combine results from both sources to improve relevance and accuracy.

## Non-Functional Requirements
- Must perform classification within 200ms.
- Memory storage must persist for 7 days per session.
- Context persistence to database must happen asynchronously.
- No external dependencies beyond existing RAG components.

## User Scenarios
### Scenario 1: Session Context
1. Doctor asks "Show me Patient 123's history"
2. Then asks "What about Patient 456?"
3. Then asks "Any follow-up visits?"
4. System tracks "Patient history" context across all queries

### Scenario 2: Ambiguous Query
1. Doctor asks "Show recent patients"
2. System should ask clarifying questions instead of returning random results

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Classifier accuracy >90% on test queries
- **SC-002**: Context maintains across 10 queries
- **SC-003**: Response time <200ms for classified queries
- **SC-004**: No random patient results in stateful mode

## Assumptions
- Existing RAG pipeline can be modified to accept context parameters
- Session storage solution will be implemented in future phase
- Classifier can be trained on existing data

## Dependencies
- Current RAG implementation at `backend/rag/pipeline.py`
- Existing patient database schema

## Edge Cases
- What happens when the classifier fails to categorize a query?
- How does the system handle memory retention when a session expires?
- What if the SQLite database is temporarily unavailable?

## Notes
- This spec focuses on the router layer, not the full RAG implementation
- Security considerations for context storage need separate specification
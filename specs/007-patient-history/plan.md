# Implementation Plan: Patient History Feature (007-patient-history)

## Summary
Implement a patient visit summary system that unifies medical records (sick leave certificates) and financial records (receipts) into a single comprehensive patient history view for doctors and patients.

## Technical Overview
This feature will create a unified patient visit management system that integrates with existing sick leave certificate and receipt generation infrastructure. The implementation will add:

1. A new VisitSummary model to link medical and financial records
2. New API endpoints for managing patient visit data
3. Enhanced frontend components for unified view display
4. Comprehensive error handling and validation

## Technical Context
- **Languages/Frameworks**: Python/Django, Next.js, TypeScript
- **Dependencies**: 
  - Existing sick leave system (spec 002)
  - Existing receipt system (spec 005)
  - Django REST Framework
  - PostgreSQL (production), SQLite (development)
- **Integration Points**:
  - Extends sick leave certificate system (spec 002)
  - Extends receipt system (spec 005)
  - Connects to patient records in SQLite
  - Uses QR code generation service from both existing systems

## Phase 0: Discovery & Research

### Unknowns Requiring Clarification
| Question | Research Answer | Priority |
|----------|----------------|----------|
| Exact VisitSummary entity structure | Review sick leave and receipt schemas for patterns | Medium |
| Data flow between certificate/receipt and visit summary | Study existing data flow patterns | High |
| Atomic operations for combined document generation | Examine existing PDF generation workflows | High |
| Error handling for concurrent updates | Review existing error handling patterns | Medium |
| Equity and lifecycle 관리 | Study biometric integration patterns | Low |

### Research Tasks
1. **Certificate-Visit Relationship Mapping**
   - Examine current sick leave certificate structure
   - Determine optimal way to link certificates to visit records
   - Research best practices for multi-relationship data modeling

2. **Visit Lifecycle Management Logic**
   - Study how visit states transition (active → revoked → expired)
   - Examine timestamp handling in existing systems
   - Determine timezone and timezone-aware date handling needs

3. **Secure Data Aggregation Patterns**
   - Research best practices for combining multiple data sources
   - Explore conflict resolution strategies for race conditions
   - Evaluate efficiency of different aggregation approaches

## Phase 1: Detailed Design & Planning

### Entity Modeling
- **VisitSummary** (core entity)
  - Unique identifier generation strategy
  - Patient foreign key relationship
  - Visit date and timezone handling
  - Status lifecycle state management
  
- **VisitCertificateIdentity** (links to certificate records)
  - Certificate ID linkage 
  - QR code token management
  - Expiration handling metadata

- **VisitReceiptIdentity** (links to receipt records)
  - Receipt reference number linkage
  - Payment status tracking
  - Revenue recognition status

### API Endpoint Design
1. **GET /api/visit-summaries/{id}/** - Complete visit summary
2. **POST /api/visit-summaries/{id}/issue-certificate/** - Generate certificate
3. **POST /api/visit-summaries/{id}/generate-receipt/** - Generate receipt
3.5 **POST /api/visit-summaries/{id}/finalize-visit/** - Complete visit transaction
4. **GET /api/visit-summaries/{id}/verify/{token}/** - Verify QR codes
5. **GET /api/visit-summaries/** Bulk search/filter

### Security & Compliance Requirements
- Fine-grained access control via existing Permission system
- Audit logging for all access/modifications
- Data retention policies matching clinic compliance needs
- Encryption at rest for sensitive health information

## Phase 1: Design Assets

### Data Model Diagram
- Visual representation of entity relationships
- Primary key definitions
- Foreign key constraints
- Indexing strategy

### Contracts Specification
1. **API Contracts**: Clear function signatures and response formats
2. **Data Schema**: JSON Schema for all API responses
3. **Web Interface Contracts**: Component API contracts

### Testing Strategy
Unit Tests:
- Certificate generation and validation
- Receipt creation and validation
- VisitSummary CRUD operations

Integration Tests:
- End-to-end visit completion scenarios
- Error condition handling
- Security permission checks

E2E Tests:
- Full flow from patient search to final documentation

## Phase 2: Development Roadmap

### Phase 0 Prep Work
1. Create VisitSummary model migration
2. Set up database migration scripts
2. Create model test fixtures

2. Create API endpoint stubs
2. Implement request validation layer
3. Create data transfer objects (DTOs)

4. Create basic frontend component scaffolding
5. Implement loading states and skeleton UI

## Phase 3: Implementation Execution
- Implement VisitSummary model with atomic update pattern
2. Build API endpoints with proper error handling
3. Implement smart merge logic between certificate and receipt data
3. Add frontend components for unified view display
4. Implement error tracking and recovery workflows

## Phase 4: Validation & Optimization
1. Load testing with realistic data volumes
3. Performance optimization of relational queries
3. Accessibility improvements
5. Final security audit of new paths

## Deliverables
1. New database models and migrations
2. Complete API endpoint implementations
3. Updated frontend components with new tabs/views
2. Comprehensive test suite covering all scenarios
3. Documentation entries for developer reference
4. Deployment scripts for production readiness

## Success Metrics
- API response time under 1s for 95% of requests
- 100% test coverage on new functionality
- Zero critical security vulnerabilities
- Seamless integration with existing authentication flows
- Minimal UI disruptions during implementation

## Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| Data inconsistency in certificate-receipt linkage | Correctness issues | Use atomic transactions with versioned updates |
| Performance degradation with complex joins | Slow queries | Implement proper indexing and denormalized caching where safe |
| User confusion about multiple document types | UX friction | Clear visual hierarchy and consistent iconography |
| Concurrent access conflicts | Data corruption | Implement versioned optimistic locking |
| Compliance edge cases | Regulatory issues | Follow clinic's existing compliance checklist |

## Next Steps
1. Run `/speckit.plan` to generate detailed technical plan
2. Create migration scripts for database updates
3. Implement API endpoints with proper error handling
3. Build frontend components with consistent UX
4. Write comprehensive test suite
5. Deploy and verify in staging environment
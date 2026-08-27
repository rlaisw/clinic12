# Clinic Medication Module - Production Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Preparation
- [ ] Verify Python 3.14+ runtime availability
- [ ] Confirm PostgreSQL/MySQL database connectivity
- [ ] Set up environment variables (.env):
  - DJANGO_SECRET_KEY
  - DATABASE_URL
  - DEBUG=False
  - ALLOWED_HOSTS=[production_domain]
  - EMAIL_BACKEND (for alerts)
  - CORS_ALLOWED_ORIGINS
  - DIFY_BASE_URL=https://dify.clinic.com.hk
  - DIFY_API_KEY (set in production)
  - LANCEDB_URI (vector database path)
  - SSRF_PROXY_HTTP_URL=http://ssrf_proxy:3128
  - SSRF_PROXY_HTTPS_URL=http://ssrf_proxy:3128
  - SSRF_PROXY_ALLOW_PRIVATE_IPS=100.0.0.0/8,10.161.92.142

### 2. Security Configuration
- [ ] Run Django security checks: `python manage.py check --deploy`
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up CSRF_TRUSTED_ORIGINS
- [ ] Configure SECURE_BROWSER_XSS_FILTER=True
- [ ] Set SECURE_CONTENT_TYPE_NOSNIFF=True
- [ ] Enable SECURE_HSTS_SECONDS (minimum 31536000 for production)
- [ ] Configure SSRF proxy settings to restrict internal access
- [ ] Set up Tailscale Funnel for secure external access
- [ ] Verify token-based authentication for all API endpoints

### 3. Database Preparation
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create database backup strategy
- [ ] Set up database connection pooling
- [ ] Verify medication data integrity (foreign keys, constraints)
- [ ] Create initial medication categories if needed
- [ ] Set up LanceDB for RAG embeddings (if using AI features)

### 4. Static Files & Assets
- [ ] Collect static files: `python manage.py collectstatic`
- [ ] Configure CDN for static/media assets
- [ ] Verify Tailwind CSS production build
- [ ] Optimize images in medication assets
- [ ] Set up PDF template storage for receipts and certificates

### 5. Application Configuration
- [ ] Set LOGGING configuration for production
- [ ] Configure cache backend (Redis/Memcached)
- [ ] Set up Celery for background tasks (if applicable)
- [ ] Configure file storage (AWS S3, Google Cloud, etc.)
- [ ] Set up monitoring and error tracking (Sentry)
- [ ] Configure Dify API endpoints for AI features
- [ ] Set up Tailscale Funnel for secure external access

### 6. Testing & Validation
- [ ] Run full test suite: `python manage.py test`
- [ ] Perform load testing on medication endpoints
- [ ] Verify API response times (<200ms for GET, <500ms for POST/PUT)
- [ ] Test alert triggering mechanisms
- [ ] Validate stock calculation accuracy
- [ ] Test AI chatbot integration and RAG query functionality
- [ ] Test receipt generation and QR code verification
- [ ] Test sick leave certificate generation and verification
- [ ] Test Tailscale tunnel connectivity

### 7. Deployment Process
- [ ] Create deployment scripts (bash, Docker, or CI/CD)
- [ ] Set up blue-green or rolling deployment strategy
- [ ] Configure health check endpoints
- [ ] Set up rollback procedures
- [ ] Document deployment steps for team

### 8. Post-Deployment Verification
- [ ] Smoke test critical medication workflows
- [ ] Verify dashboard loads correctly
- [ ] Test medication creation/update/deletion
- [ ] Confirm alert system functioning
- [ ] Check logs for errors/warnings
- [ ] Verify backup restoration process
- [ ] Test AI chatbot functionality
- [ ] Test receipt and certificate generation
- [ ] Verify Tailscale tunnel connectivity

## Medication-Specific Checks

### Inventory Management
- [ ] Test low stock alert triggering
- [ ] Verify expiring soon alert logic
- [ ] Validate stock value calculations
- [ ] Test inventory history tracking

### Supplier Management
- [ ] Test supplier information validation
- [ ] Verify contact information completeness
- [ ] Test supplier data import/export

### Reporting & Analytics
- [ ] Verify medication usage reports
- [ ] Test inventory valuation reports
- [ ] Confirm expiry date reporting

## AI Features (NEW)

### RAG System
- [ ] Verify LanceDB embeddings are up to date
- [ ] Test patient data retrieval via RAG API
- [ ] Verify hybrid search functionality works correctly
- [ ] Test patient ID extraction from queries

### AI Chatbot
- [ ] Verify Dify chatbot loads in iframe
- [ ] Test chatbot responses for patient queries
- [ ] Verify authentication tokens are valid
- [ ] Test Tailscale tunnel connectivity

### Document Generation
- [ ] Test receipt PDF generation with fillable fields
- [ ] Verify QR code generation and scanning
- [ ] Test document status transitions (active/revoked/expired)
- [ ] Verify document verification endpoint works

## Infrastructure Checks

### Tailscale Configuration
- [ ] Verify Tailscale Funnel is running
- [ ] Test HTTPS endpoints via Tailscale
- [ ] Verify tunnel connectivity from external networks

### SSRF Proxy
- [ ] Verify proxy is running and accessible
- [ ] Test internal service access through proxy
- [ ] Verify IP allowlisting is working correctly

### Database
- [ ] Verify PostgreSQL is running and accessible
- [ ] Test database backup and restore procedures
- [ ] Monitor database performance and connection counts
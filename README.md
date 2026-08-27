# Clinic11 - Medication & Patient Management System

## Overview
Clinic11 is a full-stack medication and patient management system integrating a React/Next.js frontend with a Django backend. The system provides comprehensive medication inventory management, patient records, and now includes AI-powered assistance via Dify integration.

## Key Features

### 📊 Medication Management
- Real-time inventory tracking with automatic stock alerts
- Expiry date monitoring and reporting
- Supplier management with contact integration
- Historical inventory tracking and audit trails

### 🏥 Patient Records & Dashboard
- Patient profiles with medical history, prescriptions, and sick leave certificates
- **NEW**: Receipt generation system with fillable PDFs and QR code verification
- **NEW**: AI Chatbot integration for doctor-assisted patient consultations
- Multi-tab patient dashboard (Profile, Medications, Receipts, Sick Leave, AI Chatbot)
- Theme system (Dark/Light/Light Blue/Light Green)

### 🤖 AI-Powered Features
- Dify-powered AI Chatbot for clinical decision support
- Retrieval-Augmented Generation (RAG) for context-aware responses
- Secure access via Tailscale tunneling
- Role-based access controls (doctor-only)

### 📋 Document Management
- Sick leave certificate generation with QR verification
- Fillable PDF receipt generation with auto-calculation
- Document status tracking (active/revoked/expired)
- Secure QR code verification system

## Technical Highlights

### Infrastructure
- **Backend**: Django 6.0.6 with PostgreSQL
- **Frontend**: React 19.2.0, Next.js 16.2.0, Tailwind CSS 3.4.19
- **AI Stack**: Dify workflow with RAG pipeline and Weaviate vector storage
- **Connectivity**: Tailscale secure tunneling for internal/external communication
- **Security**: SSRF proxy configuration with IP allowlisting
- **Monitoring**: Health checks, logging, and error tracking

### Integration Points
1. **SSRF Proxy**: Configured to allow internal access to RAG API and sandbox services
2. **Tailscale Funnel**: Exposes local services securely via HTTPS
3. **API Endpoints**: 
   - RAG API: `https://kilo.tail10ee0.ts.net/api/rag/query`
   - Authentication: Django REST Framework with JWT
   - File Generation: Receipt and certificate PDF endpoints
4. **Database**: Relational model with foreign key relationships between patients, medications, receipts, and certificates

## Getting Started
See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for setup instructions.

## Development
1. Clone repository
2. Install dependencies: `pnpm install` (frontend) and `pip install -r backend/requirements.txt` (backend)
3. Configure environment: Copy `.env.example` to `.env` and adjust values
4. Start services: `pnpm run dev` (starts both frontend and backend via Turborepo)

## License
MIT
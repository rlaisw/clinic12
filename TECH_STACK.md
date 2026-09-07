## 🏗️ Infrastructure & DevOps (Updated)

## 🔧 Additional Components Added

### 🤖 AI Chatbot Integration
- **Dify Integration**: Added AI-powered REINFORCEMENT LEARNING Assistant chatbot to clinic dashboard
- **Chatbot URL**: `https://kilo.clinic.com.hk/chat/CwuSNzcg0bsrG2lY`
- **Structured HTTP Flow**: 
  - Frontend: `https://kilo.clinic.com.hk:3001`
  - Backend API: `https://kilo.clinic.com.hk:8000`
- **Tab Integration**: Added "AI Chatbot" tab to patient dashboard using React Tab component and iframes
- **Authentication**: Uses Django Token Authentication (`Authorization: Token 302b3a7bf0ddf403522ec09e642bb95494da5e52`)

### 🤝 Connectivity Improvements
- Resolved SSRF proxy configuration
- Configured `SSRF_PROXY_HTTP_URL` and `SSRF_PROXY_HTTPS_URL` via Tailscale tunnel
- Configured `SSRF_PROXY_ALLOW_PRIVATE_IPS=100.0.0.0/8,10.161.92.142` for safe internal access
- Implemented hybrid HTTP routing that automatically selects Tailscale port when needed

### 💬 AI Chatbot Workflow
- Opens in iframe at `https://kilo.clinic.com.hk/chat/CwuSNzcg0bsrG2lY`
- Interactive Dify chatbot for AI-powered assistance
- Integrated into patient dashboard tab system
- Maintains doctor-specific permissions

[→ Edit this spec](https://github.com/your-repo/clinic11/specs/006-ai-chatbot-tab)
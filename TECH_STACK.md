## 🏗️ Infrastructure & DevOps (Updated)

## 🔧 Additional Components Added

### 🤖 AI Chatbot Integration
- **Dify Integration**: Added AI-powered REINFORCEMENT LEARNING Assistant chatbot to clinic dashboard
- **Tailscale Funnel**: Exposed Dify at `https://kilo.tail10ee0.ts.net` (HTTPS) and `https://kilo.tail10ee0.ts.net:8443` (HTTP) via Tailscale Funnel
- **Structured HTTP Flow**: 
  - Dify → `https://kilo.tail10ee0.ts.net` (HTTPS)
  - `https://kilo.tail10ee0.ts.net:8443` (HTTP tunnel for legacy endpoints)
- **Tab Integration**: Added "AI Chatbot" tab to patient dashboard using React Tab component and iframes
- **Authentication**: Uses same OAuth token flow as other tabs

### 🤝 Connectivity Improvements
- Resolved SSRF proxy configuration
- Configured `SSRF_PROXY_HTTP_URL` and `SSRF_PROXY_HTTPS_URL` via Tailscale tunnel
- Configured `SSRF_PROXY_ALLOW_PRIVATE_IPS=100.0.0.0/8,10.161.92.142` for safe internal access
- Implemented hybrid HTTP routing that automatically selects Tailscale port when needed

### 💬 AI Chatbot Workflow
- Opens in iframe at `https://kilo.tail10ee0.ts.net/chat/u3gp6aJ0gKWnEFDr`
- Interactive Dify chatbot for AI-powered assistance
- Integrated into patient dashboard tab system
- Maintains doctor-specific permissions

[→ Edit this spec](https://github.com/your-repo/clinic11/specs/006-ai-chatbot-tab)
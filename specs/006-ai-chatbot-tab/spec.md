# Feature Specification: AI Chatbot Tab

## Overview
Add a new "AI Chatbot" tab to the doctor's patient dashboard that opens the Dify chatbot workflow in the content area, positioned after the "Sick Leave Certificate" tab.

> **Implementation status**: Implemented. The tab renders a **direct-API** chat client (`apps/web/components/doctor/dify-chat.tsx`), not an iframe. The client claims a Dify webapp passport and POSTs to `/dify/api/chat-messages` through the frontend proxy (`apps/web/server.js`), because Dify's own web UI stalls in browsers behind the reverse proxy. The Dify webapp itself is still proxied at `/dify/*` and `/chat/*` for hosted access.

## Actors
- **Doctor**: Logged-in user with doctor role who can access patient dashboard tabs

## User Stories
- As a doctor, I want to access an AI chatbot from the patient dashboard so I can get AI-assisted insights during patient consultations.

## Functional Requirements

### FR1: Tab Visibility
- A new "AI Chatbot" tab must appear in the patient dashboard tab navigation
- The tab must be positioned immediately after "Sick Leave Certificate"
- The tab must be visible only to doctor users (consistent with other tabs)

### FR2: Tab Navigation
- Clicking the "AI Chatbot" tab navigates to `/doctor/patients/{id}/ai-chatbot`
- The tab must visually indicate when it is active (selected state styling matching other tabs)

### FR3: Chatbot Component (implemented as direct API)
- The AI Chatbot page renders `<DifyChat appCode="z0RCp1YQHYqySPZF" />` in the content area
- Client obtains the webapp passport once via `POST /dify/api/passport` (header `X-App-Code`)
- Messages are sent with `POST /dify/api/chat-messages` (JSON body: `inputs`, `query`, `response_mode: "blocking"`, `conversation_id`; headers `X-App-Code` + `X-App-Passport`)
- The input is a 4-row textarea; **Enter** sends, **Shift+Enter** inserts a newline
- Assistant answers are rendered safely (markdown text + `| ... |` tables and model-emitted HTML tables are parsed cell-by-cell and re-escaped)

## Non-Functional Requirements
- Tab must load within 2 seconds of clicking
- The chat area must be responsive to different screen sizes
- No new external dependencies required

## User Scenarios

### Scenario 1: Accessing AI Chatbot
1. Doctor logs in and navigates to a patient dashboard
2. Doctor sees "AI Chatbot" tab after "Sick Leave Certificate"
3. Doctor clicks the tab
4. The Dify chatbot loads in the content area
5. Doctor can interact with the chatbot

### Scenario 2: Tab Navigation
1. Doctor is on any patient dashboard tab
2. Doctor clicks "AI Chatbot" tab
3. Tab highlights as active
4. Chatbot loads

## Acceptance Criteria
1. Tab is visible and positioned correctly after "Sick Leave Certificate"
2. Clicking tab navigates to correct URL
3. Active state styling matches other tabs
4. Dify chatbot loads and is interactive
5. Tab is hidden for non-doctor users
6. Enter sends the message; Shift+Enter inserts a new line

## Assumptions
- The Dify app code (`z0RCp1YQHYqySPZF`) is valid and the workflow is published
- The frontend proxy (`server.js`) routes `/dify/api/*` to the Dify backend at `10.0.1.75:80`
- The same role-based access pattern applies (DoctorPermission)

## Dependencies
- Existing patient dashboard layout at `apps/web/app/(dashboard)/doctor/patients/[id]/layout.tsx`
- Existing tab navigation pattern
- Frontend proxy routes in `apps/web/server.js` (`/dify/*`)
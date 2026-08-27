# Feature Specification: AI Chatbot Tab

## Overview
Add a new "AI Chatbot" tab to the doctor's patient dashboard that opens a Dify chatbot workflow in an iframe, positioned after the "Sick Leave Certificate" tab.

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

### FR3: Chatbot Embedding
- The AI Chatbot page must embed the Dify chatbot workflow in an iframe
- The iframe source URL: `https://dify.clinic.com.hk/chat/u3gp6aJ0gKWnEFDr`
- The iframe must fill the available content area (full width, appropriate height)
- The page should have a loading indicator while the iframe loads

## Non-Functional Requirements
- Tab must load within 2 seconds of clicking
- Iframe must be responsive to different screen sizes
- No new external dependencies required

## User Scenarios

### Scenario 1: Accessing AI Chatbot
1. Doctor logs in and navigates to a patient dashboard
2. Doctor sees "AI Chatbot" tab after "Sick Leave Certificate"
3. Doctor clicks the tab
4. The Dify chatbot workflow loads in the content area
5. Doctor can interact with the chatbot

### Scenario 2: Tab Navigation
1. Doctor is on any patient dashboard tab
2. Doctor clicks "AI Chatbot" tab
3. Tab highlights as active
4. Chatbot iframe loads

## Acceptance Criteria
1. Tab is visible and positioned correctly after "Sick Leave Certificate"
2. Clicking tab navigates to correct URL
3. Active state styling matches other tabs
4. Dify chatbot loads and is interactive in iframe
5. Tab is hidden for non-doctor users

## Assumptions
- The Dify chatbot URL is accessible from users' browsers
- No authentication is needed for the iframe URL (or it handles auth internally)
- The same role-based access pattern applies (DoctorPermission)

## Dependencies
- Existing patient dashboard layout at `apps/web/app/(dashboard)/doctor/patients/[id]/layout.tsx`
- Existing tab navigation pattern
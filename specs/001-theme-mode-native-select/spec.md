# Feature Specification: Theme Mode Native Select

**Feature Branch**: `[001-theme-mode-native-select]`

**Created**: 2026-07-07

**Status**: Implemented

**Input**: User description: "replace four current theme-mode button by Shadcn/ui - 'Native Select' on landing page 'https://kilo.clinic.com.hk/patient-queue' set the 'Native Select' title to 'Theme Mode' set four <NativeSelectOption> to Dark, White, Blue, Green"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch theme from a single dropdown (Priority: P1)

The patient-queue landing page currently shows four separate theme-mode buttons (Dark, Light, Blue, Green). The user wants a single, compact "Theme Mode" selector (a native dropdown) that lists four options — Dark, White, Blue, Green — and applies the chosen theme immediately.

**Why this priority**: This is the core of the request: consolidate four buttons into one control and preserve the ability to switch between all four themes.

**Independent Test**: On the patient-queue landing page, open the "Theme Mode" control, select "Blue", and confirm the page switches to the blue-themed appearance; the same can be verified independently for Dark, White, and Green.

**Acceptance Scenarios**:

1. **Given** the patient-queue landing page is displayed, **When** the user opens the "Theme Mode" control, **Then** four options (Dark, White, Blue, Green) are available.
2. **Given** the control is open, **When** the user selects "Green", **Then** the active theme changes to the green theme and the page appearance updates immediately.
3. **Given** the user is on the landing page, **When** they reload the page, **Then** the previously selected theme remains applied.

---

### User Story 2 - Current theme is reflected in the control (Priority: P2)

The dropdown must indicate which theme is currently active so the user is not forced to guess.

**Why this priority**: Without showing the active selection, the control is ambiguous and degrades usability versus the old button row (where the active button was highlighted).

**Independent Test**: With the "Blue" theme active, open the "Theme Mode" control and confirm "Blue" is shown as the currently selected option.

**Acceptance Scenarios**:

1. **Given** the active theme is "White", **When** the user opens the control, **Then** "White" is displayed as the selected option.
2. **Given** the user changes the theme to "Dark", **When** they reopen the control, **Then** "Dark" is shown as the selected option.

---

### User Story 3 - Keyboard and assistive-technology operable (Priority: P3)

The new control must be usable without a mouse and must be correctly labeled for screen readers, preserving accessibility.

**Why this priority**: A native select is inherently accessible, but it must carry the proper "Theme Mode" label so assistive technology announces it correctly.

**Independent Test**: Using only the keyboard (Tab to focus, Enter/Space to open, arrow keys + Enter to choose), a user can change the theme; the control is announced as "Theme Mode".

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** they focus the control, **Then** it is reachable via Tab and operable with arrow/Enter keys.
2. **Given** a screen-reader user, **When** they encounter the control, **Then** it is announced with the label "Theme Mode".

---

### Edge Cases

- What happens when the user selects the theme that is already active? (No visual break; theme stays applied, no error.)
- How does the system behave on first visit with no saved preference? (Default theme is applied and shown as selected — assumed "White"/light per existing default.)
- What happens if a stored theme value is missing/corrupt? (Fall back to the default theme and show it as selected.)
- Does the control remain usable if JavaScript fails to enhance it? (A native select degrades gracefully and still allows selection.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the four individual theme-mode buttons on the patient-queue landing page with a single "Theme Mode" selector control.
- **FR-002**: System MUST title the control "Theme Mode".
- **FR-003**: System MUST offer exactly four selectable options labeled "Dark", "White", "Blue", and "Green".
- **FR-004**: Users MUST be able to change the active theme by selecting an option, and the selected theme MUST apply immediately to the page.
- **FR-005**: System MUST display the currently active theme as the selected option in the control.
- **FR-006**: System MUST persist the chosen theme across page reloads and sessions (existing persistence behavior retained).
- **FR-007**: The control MUST be keyboard operable and correctly labeled "Theme Mode" for assistive technology.
- **FR-008**: System MUST continue to support the four existing underlying theme modes (dark, light, light-blue, light-green) without removing any.

### Key Entities *(include if feature involves data)*

- **Theme Mode**: One of four supported appearance modes. Display labels: Dark, White, Blue, Green. Underlying modes preserved: dark, light, light-blue, light-green.
- **Theme Preference**: The user's selected theme, persisted (existing mechanism: localStorage / URL parameter) and restored on load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can switch the active theme with a single control interaction (open + select) instead of four separate buttons.
- **SC-002**: 100% of theme selections apply the correct appearance and persist across a page reload.
- **SC-003**: All four options (Dark, White, Blue, Green) are present and each applies its corresponding theme correctly.
- **SC-004**: A keyboard-only user can operate the control and select any of the four themes without a mouse.
- **SC-005**: The control is announced as "Theme Mode" by assistive technology.

## Assumptions

- "Landing page" refers to the patient-queue page (the dashboard layout that currently renders the four theme-mode buttons at `https://kilo.clinic.com.hk/patient-queue`).
- The requested option labels map to the four existing underlying themes: Dark→`dark`, White→`light`, Blue→`light-blue`, Green→`light-green`. No new themes are introduced.
- The control is implemented using the Shadcn/ui "Native Select" component (`NativeSelect` / `NativeSelectOption`) as explicitly requested by the user.
- The existing theme persistence mechanism (localStorage + URL parameter) is reused unchanged.
- The default theme on first visit remains the existing default (light/"White").

# Quickstart Validation: Theme Mode Native Select

**Feature**: 001-theme-mode-native-select
**Date**: 2026-07-07

Runnable scenarios that prove the feature works end-to-end. Prerequisites, setup, and expected outcomes only — implementation belongs in `tasks.md`.

---

## Prerequisites

- Node/pnpm installed (project uses pnpm; see `pnpm-lock.yaml`).
- Dev server can run the Next.js `apps/web` app.
- A browser for manual UI validation.

## Setup

```powershell
# from repo root
pnpm install
pnpm dev          # or: pnpm --filter apps/web dev
```

Open the patient-queue landing page:
`http://localhost:3000/patient-queue`
(or the deployed URL `https://kilo.clinic.com.hk/patient-queue`).

## Validation Scenarios

### V1 — Four options present (FR-001/FR-002/FR-003 / SC-003)
1. Locate the "Theme Mode" control on the page (replaces the old four buttons).
2. Open it.
3. **Expected**: exactly four options listed — Dark, White, Blue, Green.

### V2 — Each option applies its theme (FR-004 / SC-003)
1. Select **Blue** → page shows the blue-tinted theme immediately.
2. Select **Green** → green-tinted theme.
3. Select **White** → light theme.
4. Select **Dark** → dark theme.
5. **Expected**: each selection changes the appearance with no reload.

### V3 — Current theme reflected (FR-005 / User Story 2)
1. With **Green** active, reopen the control.
2. **Expected**: "Green" is shown as the selected option.
3. Switch to **Dark**, reopen → "Dark" shown selected.

### V4 — Persistence across reload (FR-006 / SC-002)
1. Select **Blue**, then reload the page.
2. **Expected**: the blue theme is still applied and "Blue" is the selected option.

### V5 — Keyboard & screen reader (FR-007 / SC-004 / SC-005)
1. Tab to the control (it receives focus).
2. Use arrow keys + Enter to choose **Dark**.
3. **Expected**: theme changes; control is announced as "Theme Mode" by a screen reader.

## Optional automated check
A component/unit test can assert that `theme-toggle.tsx` renders four `NativeSelectOption`
elements with values `dark`, `light`, `light-blue`, `light-green` and that selecting one
calls `setTheme` with the correct value (see `data-model.md` and `contracts/ui-theme-select.md`).

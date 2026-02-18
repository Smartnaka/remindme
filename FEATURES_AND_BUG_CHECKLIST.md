# Proposed Features & Bug Check Guide

This document captures practical next-step features and a repeatable bug-check checklist for the RemindMe app.

## Proposed Features

### 1) Recurring Academic Events (Bi-weekly / Custom)
- Allow lectures to repeat every 1, 2, or N weeks.
- Add semester start/end boundaries to avoid reminders during breaks.
- Why it helps: Many university timetables are odd/even week based.

### 2) Assignment Deadlines with Priority Levels
- Add assignment reminders with `low`, `medium`, and `high` priority.
- Show a "next upcoming deadline" card on the home tab.
- Why it helps: Supports non-lecture workflows where deadlines are critical.

### 3) Smart Snooze for Notifications
- Add quick actions: `Snooze 10m`, `Snooze 30m`, `Dismiss`.
- Track snooze usage to suggest better default reminder times.
- Why it helps: Reduces reminder fatigue while preserving reliability.

### 4) Calendar Import / Export (ICS)
- Import a timetable from `.ics` files.
- Export lectures/exams for backup and migration.
- Why it helps: Faster onboarding and improved data portability.

### 5) Conflict Detection Assistant
- Detect overlap between lectures, exams, and assignments.
- Show inline warnings before saving conflicting items.
- Why it helps: Prevents planning mistakes early.

### 6) "Missed Lecture" Recovery Flow
- If a lecture reminder is missed, surface a recovery card:
  - Mark as attended/absent.
  - Add follow-up task (e.g., watch recording).
- Why it helps: Encourages action after missed sessions.

---

## Bug Check Checklist

Use this checklist before each release (or after major changes).

### A) Installation / Environment
- [ ] `npm install` completes without dependency errors.
- [ ] App launches with `npx expo start` and opens on at least one platform.
- [ ] No critical warnings during app startup.

### B) Lecture CRUD
- [ ] Create lecture with valid input and verify it appears in list/week view.
- [ ] Edit lecture details and verify persistence after app restart.
- [ ] Delete lecture and verify related reminders are cancelled.
- [ ] Validate edge cases (empty title, invalid time range, invalid day).

### C) Notification Reliability
- [ ] Grant notification permissions and confirm reminders are scheduled.
- [ ] Confirm iOS local notifications trigger at expected time.
- [ ] Confirm Android exact alarms trigger at expected time.
- [ ] Verify reminder behavior when device is in battery-saving mode.

### D) Time & Date Edge Cases
- [ ] Validate behavior across timezone changes.
- [ ] Validate around daylight saving transitions.
- [ ] Verify 12h/24h time format compatibility.

### E) Data Integrity
- [ ] Confirm AsyncStorage data loads correctly on cold start.
- [ ] Confirm migration behavior when schema evolves.
- [ ] Validate app behavior with corrupted or missing stored data.

### F) UI/UX & Accessibility
- [ ] Check contrast in light and dark themes.
- [ ] Verify haptics do not block user interactions.
- [ ] Ensure tappable targets are accessible and labels are meaningful.
- [ ] Validate layout on small and large screens.

### G) Regression Test Commands
- [ ] Run unit tests: `npm test -- --runInBand`
- [ ] Run type checks: `npx tsc --noEmit`
- [ ] Smoke-test app startup: `npx expo start --web`

---

## Current Known Risk to Track

- Automated unit tests may fail to execute in fresh environments if Jest dependency resolution is incomplete or blocked by registry policy. Confirm your npm registry access and re-run install before test execution.

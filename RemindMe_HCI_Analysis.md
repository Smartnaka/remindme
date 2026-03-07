# RemindMe App — Full HCI & UX Analysis Report
**Analyst Role:** Human–Computer Interaction Expert, Product Designer & Software Engineer  
**App:** RemindMe (v1.2.0) — React Native / Expo — Student Lecture Reminder App  
**Date:** March 2026

---

## Executive Summary

RemindMe is a student-facing academic scheduler with a solid technical foundation, a clean iOS-influenced aesthetic, and thoughtful features like haptic feedback, dark mode, and a hybrid notification system. However, a deep simulation of real human behavior—especially from students—reveals a cluster of friction points, trust gaps, and confusion scenarios that could cause users to abandon the app or misuse it. This report catalogs every realistic failure scenario, simulates full user journeys, and provides actionable UX solutions grounded in HCI principles.

---

## Section 1: User Use Cases & Behavioral Simulation

### 1.1 First-Time User

**Profile:** A university freshman who downloaded the app the night before their first week of classes.

**What they try to do:** They open the app expecting a guided setup—a screen asking "What's your schedule?" They're hoping to tap through something simple.

**What they tap first:** The FAB (floating action button, the "+" at the bottom right of the home screen). This is correct behavior, but they get a context menu with three options: "Lecture," "Assignment," and "Exam." They don't know which to pick first and feel mild confusion.

**Where confusion happens:**
- The app launches directly onto the home tab with an empty state ("No lectures today"). There is no onboarding flow whatsoever. The user has no mental model of how the app is structured.
- They don't understand the difference between the four tabs: Home, Week, Exams, Settings. "Week" is ambiguous—does it show this week's lectures, or do you set up your weekly schedule there?
- On the "Add Lecture" form, they see "Course Name," "Days of Week" (a horizontal chip scroll), Start/End time pickers, "Frequency" (Weekly/Bi-weekly), and a color picker. The volume of options on a first use is overwhelming.
- The color picker has no label. A student might wonder: "Is this just decoration, or does it do something?"
- After saving their first lecture, they return to the home screen. If today is not the day of that lecture, the home screen still shows "No lectures today." They assume the save failed.

**Mistakes they make:**
- Tapping "Save" before selecting a day of week (which causes a validation error, but without sufficient contextual explanation of what's wrong).
- Adding a lecture with no end time changed from the default, not realizing the default end time might match or precede the start time.
- Exiting the "Add Lecture" form by pressing the Android back button, losing all their data with no "Are you sure?" prompt.

**HCI Problem:** Zero onboarding. The app dumps users into a blank screen with no guidance, no tooltips, no empty state CTA that explains the full workflow.

**Solution:** Add a 3-step onboarding carousel (skippable) that shows: (1) "Add your lectures," (2) "Track exams and assignments," (3) "Get smart reminders." Include a persistent banner on first launch: "Tap + to add your first class." Show a highlighted pulsing dot on the FAB for the first session.

---

### 1.2 Returning User

**Profile:** A student in week 3 of semester who uses the app daily.

**What they try to do:** They want to edit a lecture because their professor changed the room location.

**What they tap first:** They tap the lecture card on the home screen, expecting it to open an edit form.

**Where confusion happens:**
- Tapping the lecture card on the home screen navigates to a **lecture detail page** (`/lecture/[id]`), not directly to an edit screen. The edit button may be in the header (a pencil icon), but it's small and easy to miss.
- The user may swipe the lecture card on the home screen, accidentally triggering the swipeable row's delete or complete action.

**Mistakes they make:**
- Accidentally swiping to delete a lecture when they meant to scroll the page.
- Editing a lecture but forgetting to tap "Save" in the top-right corner (since it's a small text button, not a prominent CTA), then navigating back and losing changes.

**Solution:** Make the lecture detail page header "Edit" button more prominent—use a filled button or an edit icon with a label. Add a "Save Changes?" bottom sheet confirmation if the user tries to navigate back after making edits. Increase the swipe gesture threshold to prevent accidental deletions.

---

### 1.3 Confused User

**Profile:** A student who doesn't read instructions and acts on instinct.

**What they try to do:** They want to see all their classes for the week.

**What they tap first:** "Home" tab, assuming it shows everything. It only shows today's schedule.

**Where confusion happens:**
- The tab labeled "Week" could mean "set up your weekly schedule" OR "view this week." No icon or subtitle clarifies this.
- The "Exams" tab looks different from the lecture-centric home screen, creating the impression the app has two entirely separate systems.
- On the "Add Assignment" screen, they see "Course" is a required field—but assignments must be linked to an existing lecture/course. If the user hasn't added any lectures yet, the course dropdown is empty with no explanation.
- The notification dot on the bell icon in the header draws their attention, but tapping it opens a "Notifications" screen that shows mock/static data (as confirmed in the CODE_REVIEW.md). This destroys trust—"Did I set up reminders correctly? I can't tell."

**Mistakes they make:**
- Adding an exam without having added lectures, leading to a course-linking issue.
- Thinking the notification bell is a live inbox; being confused when the content doesn't match their expectations.

**Solution:** Rename "Week" to "Schedule" or "Timetable." Add subtitle text under tab labels on first use. On the empty course picker, show a prompt: "No courses yet — add a lecture first." Fix the notifications screen to show real scheduled notification data, or clearly label it as a history/log.

---

### 1.4 Impatient User

**Profile:** A student rushing between classes who needs to quickly mark an assignment complete or add a quick exam reminder.

**What they try to do:** Add an exam in under 10 seconds.

**What they tap first:** FAB → "Exam" → lands on "Add Exam" form.

**Where confusion happens:**
- The form has multiple required fields (course, exam name, date, start time, end time, location). An impatient user wants a minimum viable form.
- The time pickers (especially on Android) open a system dialog that requires multiple taps to confirm.
- After saving, the success toast ("Added to [Course Name]") appears briefly at the bottom and disappears. The user, who glanced away, might miss it entirely and wonder if the save succeeded.

**Mistakes they make:**
- Leaving required fields blank and getting an error message they don't fully read.
- Tapping "Save" multiple times if there's any perceived lag, potentially creating duplicate entries.
- Closing the app before the save operation completes (async race condition with no save-lock UI feedback).

**Solution:** Make the minimum required fields for exam creation just the course and date—treat everything else as optional. Show a persistent success state (e.g., the card appears in the list with an animation) rather than relying only on a transient toast. Disable the Save button while saving is in progress and show a spinner inside the button.

---

### 1.5 User with Poor Internet

**Profile:** A student on a spotty campus Wi-Fi or mobile data.

**What they try to do:** Add a new lecture or sync their calendar.

**Where confusion happens:**
- The app is "offline-first" using AsyncStorage, so lecture CRUD should work offline. However, the calendar sync feature (`utils/calendar.ts`) calls `Calendar.deleteCalendarAsync()` and `createCalendar()`—these require device API calls that may still fail silently in degraded states.
- There is **no offline detection** and **no offline banner**. A user on poor connectivity doesn't know if failures are their fault or the network's.
- The notification scheduling logic is entirely local, so it should work—but the user doesn't know this and may distrust the app.
- The CODE_REVIEW confirms there is no `@react-native-community/netinfo` integration. Calendar sync fails silently with no user feedback.

**Mistakes they make:**
- Assuming a failure during calendar sync means their lecture wasn't saved (it was—the local data is fine).
- Retrying the same action multiple times, creating duplicate calendar events.

**Solution:** Add a network status listener. When offline, hide or disable the "Sync to Calendar" option with a tooltip explaining why. Show an offline badge in the header. After any failed network operation, show a specific error: "Calendar sync failed — your lecture is saved locally and will sync when connection is restored."

---

### 1.6 User Who Misunderstands the UI

**Profile:** A student unfamiliar with iOS-style UI patterns (common on Android).

**What they try to do:** They want to delete a lecture.

**What they tap first:** They tap and hold the lecture card (long-press), expecting a context menu (common Android pattern). Nothing happens.

**Where confusion happens:**
- Deletion is via swipe gesture on the `SwipeableLectureRow` component. This is an iOS-native pattern. Android users may never discover it.
- There's a "swipe hint" text at the bottom of the screen (`styles.swipeHint`), but it's small, low-contrast (muted color, 0.7 opacity), and positioned at the very bottom where users rarely look.
- The "Cancel" button on Add/Edit screens is styled as plain text (iOS convention). Many Android users expect a back arrow or an "X" button and won't associate a text label with "discard and go back."
- On the Settings screen, the "Manage Data" section contains destructive options like "Clear All Lectures." These appear as simple list rows—the same visual weight as non-destructive settings. There's no visual hierarchy to warn users that these are dangerous.

**Mistakes they make:**
- Accidentally triggering the swipe-to-delete action mid-scroll.
- Tapping "Clear All Lectures" thinking it means "archive" or "clear completed" rather than permanent deletion. Even though there's a confirmation modal, the button's placement and labeling before that point is misleading.

**Solution:** Add a long-press context menu as an alternative to swipe (showing "Edit," "Delete" options). Make the swipe hint more prominent—consider a one-time animated tutorial swipe on first lecture display. Style destructive settings in red with a warning icon and add a horizontal separator above the danger zone. Label the button "Permanently Delete All Lectures" rather than "Clear All Lectures."

---

## Section 2: Failure Points Deep-Dive

### 2.1 UI Misunderstandings

| Element | Misunderstanding | Root Cause | Fix |
|---|---|---|---|
| FAB menu | User doesn't know what to add first | No guided flow | Show a tooltip: "Start by adding a lecture" |
| Notification bell dot | Perceived as live inbox | Dot is always present; screen shows mock data | Remove dot until real notifications exist; fix notification screen |
| Color picker | Purpose unclear | No label or explanation | Add label: "Course Color — helps identify this class at a glance" |
| "Week" tab | Ambiguous meaning | Label too generic | Rename to "Schedule" or "Timetable" |
| "Cancel" text button | Not recognized as back action | iOS-only pattern | On Android, pair with a back arrow icon |
| Bi-weekly frequency chip | "Does this mean every 2 weeks or twice a week?" | "Bi-weekly" is linguistically ambiguous | Use "Every 2 Weeks" instead |

### 2.2 Navigation Confusion

The app uses a tab-based structure (Home, Week, Exams, Settings) plus stack navigation for add/edit screens. Key issues:

**No breadcrumb or context indicator.** When a user is inside "Add Assignment," they see a header saying "New Assignment" but don't know which tab they came from. On Android, pressing the system back button sometimes exits the screen, sometimes the app—this depends on navigation stack state and is unpredictable.

**The lecture detail screen (`/lecture/[id]`) is a dead end for new users.** It shows lecture details but without clear actions to edit, delete, or add an assignment linked to it, users don't know what to do next.

**Deep linking from notifications is unconfirmed.** When a user taps a notification, they should land on the relevant lecture or exam. The `handleNotificationResponse` logic exists but there's no evidence it properly navigates to the correct screen. A user could tap a lecture reminder notification and land on the home screen with no indication of which lecture fired it.

### 2.3 Accidental Taps

The most dangerous accidental tap scenario is the swipe-to-delete on lecture cards. The swipeable gesture area covers the full card width. A user scrolling the list with any horizontal component to their gesture can trigger it. The `UndoToast` component does provide an undo mechanism—but it's a toast (transient), meaning slow readers miss the window.

Recommended fix: Extend the undo window to 6–8 seconds. On Android, also show the undo action as a Snackbar which persists until dismissed. Require the user to swipe past a threshold of 60–70% of card width before showing the delete state, rather than activating at smaller distances.

### 2.4 Missing Feedback

**Calendar sync** has no feedback at all—success or failure. The user enables the "Sync to Calendar" toggle in settings and has no way to confirm it worked.

**Notification permission grant** happens at first launch. If the user denies it, the app continues silently. There is a `Permission Required` alert in `sendTestNotification()`, but the primary notification scheduling path (`requestNotificationPermissions`) returns `false` silently without surfacing an explanation to the user on the main screens.

**Save operations on Add screens** show a "Saving..." state on the button, which is good. But if the save succeeds and the screen closes, the user is returned to the list—there is no focus or scroll to the newly added item. The `SuccessToast` appears but the item is not visually highlighted in the list.

### 2.5 Unclear Buttons

The header on all Add/Edit screens has:
- Left: "Cancel" (plain text, small tap target — only `padding: 8` around the text)
- Center: Screen title
- Right: "Save" (plain text, slightly bolder)

Both are text-only with identical tap areas. A user in a hurry could tap "Cancel" thinking it's a safe secondary action, losing all their data. This is especially dangerous on the "Add Lecture" screen which has the most fields.

Fix: Increase tap target to minimum 44×44pt (Apple HIG) / 48×48dp (Material Design). Style "Save" as a filled pill button in the primary color. Style "Cancel" in muted gray.

### 2.6 Slow Loading Screens

The CODE_REVIEW notes missing loading states for:
- Initial data load from AsyncStorage
- Calendar sync
- Notification rescheduling (which happens every time a lecture is edited)
- Settings save operations

On lower-end Android devices, AsyncStorage reads can take 100–300ms. During this window, the home screen renders with no data, then suddenly populates. This "flash of empty content" makes users think the app is broken or that their data was lost.

Fix: Add skeleton screens for the home tab and week tab during initial load. Use a shimmer effect on lecture cards while data loads. This is especially important on cold start.

---

## Section 3: Human Psychology Analysis

### 3.1 User Expectations vs. Reality

**Mental model of a reminder app:** Users come from Google Calendar, Apple Calendar, or class-specific apps. They expect: (1) a simple form to enter class name and time, (2) automatic recurring reminders, (3) a weekly grid view. RemindMe meets most of this but frames things differently—"lectures" instead of "events," a list-based home instead of a calendar grid, and a "Week" tab that shows a timeline rather than a grid. This mismatch in mental model causes early friction.

**Expected feedback loop:** When a user sets a reminder, they expect confirmation that it will fire. The app shows a static text: "Notifications will be sent X minutes before class." This is insufficient. Users trust reminders more when they see a concrete example: "You'll get a reminder on Monday at 8:45 AM."

**Trust in the notification system:** Android's battery optimization aggressively kills background processes. The app requests `SCHEDULE_EXACT_ALARM` permission but the README admits this is a known failure point. Students relying on this app to not miss class will quickly distrust it after one missed reminder. There must be a visible "Test notification" button on the home screen or a post-setup verification step, not just buried in Settings.

### 3.2 Frustration Points

These are the moments most likely to cause a user to close the app or uninstall it:

1. **Adding a lecture and coming back to an empty home screen.** The user doesn't realize the home screen only shows today's lectures. They think the save failed.
2. **The notification bell shows a dot, but the notification history is mock data.** This destroys trust in the whole app.
3. **Calendar sync silently deletes and recreates the entire RemindMe calendar.** If a user added notes to calendar events manually, those are gone. On Android especially, this could cause visible calendar churn.
4. **No way to bulk-add a timetable.** A student with 5 courses, each with 2 sessions per week, must make 10 separate form submissions. After the 5th, frustration peaks.
5. **Losing form data on back navigation.** This is a classic mobile UX failure that consistently ranks among the top reasons users rate apps 1-star.

### 3.3 Abandonment Zones

Based on the flow, users are most likely to abandon at:
- **Onboarding (first launch):** No guidance, blank state, no clear starting action.
- **After first lecture save:** Returning to what appears to be an empty home screen.
- **After a missed notification:** The notification system is not reliable enough on Android battery-saver mode. One missed class = app deleted.
- **When trying to understand the difference between Home and Week tabs:** If they can't figure out the information architecture in 30 seconds, they leave.

### 3.4 UI Misinterpretation Risks

The "priority" chips on Add Assignment (Low / Medium / High) have no explanation of what priority affects. Does it change the notification timing? The visual prominence of the card? Does "High" mean the assignment is due sooner? Users will set this arbitrarily without understanding its effect.

The "Quiet Hours" setting in Settings is powerful but confusing. The label "Quiet Hours Start / End" doesn't explain that notifications will be suppressed during this window. A student who sets quiet hours from 11 PM to 7 AM might not realize their 7:30 AM class reminder could be affected if their device clock is slightly off.

---

## Section 4: Full User Journey Simulation

### Journey: Opening the App (Cold Start)

1. User taps the RemindMe icon.
2. Splash screen appears (light or dark depending on system theme) — good.
3. App loads the home tab. AsyncStorage reads lecture data.
4. **[Risk]** If this takes >200ms on a slow device, the user sees a blank screen with no skeleton/loading indicator before content appears.
5. If it's not a lecture day, the user sees: "No lectures today" with an icon and a button to "Add your first class."
6. **[Risk]** If the user has lectures but today isn't one of those days, the empty state still shows, making them think the app lost their data. The empty state doesn't differentiate between "no lectures exist" and "no lectures today."

**Fix:** Change the empty state message based on context: "You have no classes today — check the Week tab for your full schedule" when lectures exist but none are today.

### Journey: Onboarding (First-Time Add)

1. User taps FAB (+).
2. A modal menu appears with three options: Lecture, Assignment, Exam.
3. **[Risk]** No guidance on what to start with. Adding an Assignment requires a Course (Lecture) to exist first. The ordering dependency is invisible.
4. User selects "Lecture."
5. "Add Lecture" screen slides up.
6. User sees fields: Course Name, Days (horizontal scroll), Start Time, End Time, Location (optional), Frequency, Color.
7. **[Risk]** The day selector is a horizontally scrollable chip row starting at "Mon." On small screens, users might not realize they can scroll to see Sat/Sun. There's no scroll indicator.
8. User fills in course name, taps a day, sets times.
9. **[Risk]** The time pickers are native OS pickers. On Android, "default" display mode is a clock face that many users find hard to use for exact times. The app uses `is24Hour={false}` (12-hour), which might not match the user's system preference.
10. User taps Save.
11. Haptic feedback fires (good). SuccessToast appears. Screen closes.
12. **[Risk]** User is returned to the home screen. If today is not the lecture day they chose, they see the empty state. Confusion ensues.

### Journey: Completing a Task (Marking an Assignment Done)

1. User opens home tab. Sees an upcoming assignment card.
2. Taps the assignment card — expectation: open detail or toggle completion.
3. **[Risk]** The behavior of tapping an assignment card on the home screen is unclear from the code. If it opens a detail view, the "mark complete" action must be accessible there. If there's a checkbox, it may not be obvious it's interactive.
4. User marks assignment complete.
5. **[Risk]** If confetti celebration fires (ConfettiCelebration component), it could be jarring for users who have notifications suppressed or are in a public place. The animation should respect the "Reduce Motion" setting.
6. The assignment disappears from the list.
7. **[Risk]** No undo. Unlike lecture deletion (which has UndoToast), accidental completion of an assignment cannot be reversed easily.

**Fix:** Add a brief undo window (5 seconds) after marking an assignment complete, same as the lecture delete flow.

### Journey: Exiting the App

1. User presses Android back button from the home tab.
2. **[Risk]** The app exits immediately. On iOS, the user presses the home button or swipes up. No issue.
3. **[Risk]** On Android, if the user is inside a form (Add Lecture/Exam/Assignment), pressing back dismisses without saving and without a "discard changes?" prompt. This is a critical data loss scenario.

**Fix:** Intercept the hardware back button on all form screens. If the form has any data entered, show a confirmation dialog: "Discard changes?" with "Keep Editing" and "Discard" options.

---

## Section 5: Edge Cases & Unexpected Behavior

### 5.1 Time-Based Edge Cases

**Midnight-spanning lectures:** A student in a creative arts program might have a lecture from 11 PM to 1 AM. The `validateTimeRange` function correctly rejects end times before start times, but has no logic for midnight-spanning events. These students cannot use the app for those classes.

**Timezone changes:** A student who travels across timezones (e.g., for a conference) will have all their local notifications fire at the wrong times. There is no timezone-awareness check.

**Daylight Saving Time (DST):** The FEATURES_AND_BUG_CHECKLIST acknowledges this as an untested edge case. A weekly lecture notification scheduled via `Notifications.scheduleNotificationAsync` with a `CALENDAR` trigger should handle DST automatically, but this has not been confirmed.

**Last day of semester:** If the user hasn't set semester end dates in Settings, notifications continue indefinitely, even during semester breaks and summer. The semester limits feature exists in Settings but is optional and not prominently surfaced during onboarding.

### 5.2 Data Edge Cases

**Duplicate lectures:** Nothing prevents a user from creating two identical lectures (same course, same day, same time). The app will happily schedule two identical notifications and show two identical cards.

**Very long course names:** The validation allows up to 100 characters. A 100-character course name will overflow lecture card UI elements designed for typical 3–5 word names.

**Assignment with past due date:** A user can add an assignment with a due date in the past. The notification scheduling will silently skip it (`if (triggerDate > now) { ... } return null`) with no user feedback. The assignment appears in the list but will never trigger a notification—the user doesn't know this.

**Fix:** When an assignment or exam is saved with a past date/time, show an inline warning: "This date has passed — no reminder will be sent."

### 5.3 Notification Edge Cases

**Notification permission denied after grant:** A user can revoke notification permissions from device settings after granting them. The app doesn't check permission status on each launch—it only checks when scheduling. Existing scheduled notifications still fire (they're already queued), but new additions silently fail.

**Snooze overflow:** The snooze feature accepts custom minutes via text input with a cap of 120 minutes. If the user enters "0" or a negative number, the code fallback is 10 minutes. But there's no UI feedback that their input was ignored.

**Multiple rapid saves:** On a slow device, if a user taps "Save" before the `isSaving` state is set (within the first render cycle), they could trigger two save operations. The button has a `disabled={isSaving}` guard but `isSaving` starts as `false`—there may be a small window.

### 5.4 Unexpected User Behaviors

**Power user adding 15+ lectures:** The home tab uses a `ScrollView`, not a `FlatList` with virtualization (as flagged in the CODE_REVIEW). With 15+ lecture cards rendered simultaneously, scroll performance will degrade noticeably on older Android devices.

**Student using app for a course with no fixed schedule:** Some students have seminars or irregular lectures. They may try to add a lecture without a day selected, or add the same "lecture" multiple times as one-off entries. The UI isn't designed for irregular scheduling.

**Student sharing device:** Multiple students using the same device get the same app data. There's no user/profile system. All lectures, exams, and assignments from different students will mix together.

**Left-handed users:** The FAB is positioned at the bottom-right. This is standard, but the swipe-to-delete gesture on lecture rows is directional. If swipe is right-to-left (delete) and left-to-right (complete), left-handed users who scroll with their right hand may accidentally trigger actions.

---

## Section 6: Prioritized UX Improvements

### Priority 1 — Critical (Pre-Launch Blockers)

**1. Add Onboarding Flow**
A 3-screen carousel on first launch explaining the app's 3 core concepts: Schedule → Reminders → Track. Include a "Get Started" CTA that navigates to a guided first-lecture creation. Persist a `hasOnboarded` flag in AsyncStorage.

**2. Fix the Empty Home Screen After Adding a Lecture**
This is the #1 trust-killer. The empty state must distinguish between "no lectures exist" and "no lectures today." When the latter, show the next upcoming lecture with a preview card and text like "Next class: CS101 — tomorrow at 9:00 AM."

**3. Fix the Notification History Screen**
The notifications screen currently shows mock/placeholder data. Either connect it to real notification data or replace it with a "Scheduled Reminders" view that lists upcoming notification times per lecture. Any screen that shows fabricated data in a production app is a serious credibility failure.

**4. Prevent Data Loss on Back Navigation**
Intercept back navigation on all Add/Edit forms. Detect if the form is "dirty" (any field changed from its initial state). If so, prompt with a "Discard Changes?" dialog before navigating away.

**5. Show Concrete Notification Preview**
Replace the static text "Notifications will be sent X minutes before class" with a dynamic preview: "Your next reminder for this class: Monday, Mar 9 at 8:45 AM." This builds trust in the notification system.

### Priority 2 — High (Week 1–2 Post-Launch)

**6. Add Long-Press Context Menu to Lecture Cards**
Give Android users a familiar interaction model alongside swipe gestures. Long-press shows a bottom sheet with: "Edit Lecture," "View Details," "Delete Lecture."

**7. Require Minimum 44pt Tap Targets on Header Buttons**
The Cancel and Save text buttons in form headers have `padding: 8` which is approximately 32×32pt—below the minimum for accessible touch. Increase to at least 44×44pt.

**8. Show Explicit Calendar Sync Status**
Add a "Sync Status" row in Settings showing: last sync time, number of events synced, and a manual "Sync Now" button. Show an error state if the last sync failed.

**9. Warn on Past-Date Notifications**
When saving an exam or assignment with a past date, show an inline warning: "This date has already passed. No reminder will be sent."

**10. Add "Reduce Motion" Respect to Confetti**
The `ConfettiCelebration` component should check the `settings.reduceMotion` flag before playing. Currently only screen transitions may respect this setting.

### Priority 3 — Medium (Iteration 2)

**11. Add Bulk Timetable Entry**
Allow CSV or ICS import. A student with a full semester schedule should not need to make 10+ individual form submissions. Even a simple "copy this lecture to another day" feature would help.

**12. Add Conflict Detection**
Before saving a lecture, check for time overlaps with existing lectures. Show an inline warning: "You already have CS101 scheduled at this time on Mondays."

**13. Replace "Clear All Lectures" with "End Semester"**
Rename the destructive data-clear actions to contextually appropriate labels. "End Semester" better conveys the intended use case and reduces the chance of accidental data deletion. Move all destructive actions behind a collapsed "Danger Zone" section.

**14. Add Per-Day Swipe Tutorial**
On the first visit to the home tab that shows lecture cards, animate a brief swipe gesture tutorial on the first card — swipe partially right, then snap back — to teach the gesture without requiring the user to discover it.

**15. Improve Assignment Priority Explanation**
Add a subtitle under the "Priority" label on the Add Assignment screen: "Higher priority assignments appear first in your list." This closes the loop on what priority actually does.

---

## Section 7: Usability Heuristics Scorecard (Nielsen's 10)

| Heuristic | Score (1–5) | Notes |
|---|---|---|
| 1. Visibility of system status | 2/5 | Missing on calendar sync, notification scheduling, and async loads |
| 2. Match between system and real world | 3/5 | "Lecture" vs "Event" is fine for students; "Bi-weekly" is ambiguous |
| 3. User control and freedom | 2/5 | No undo on assignment completion; no back-navigation guard on forms |
| 4. Consistency and standards | 3/5 | iOS conventions used throughout but app targets Android too |
| 5. Error prevention | 3/5 | Validation exists but doesn't prevent past-date assignments or duplicates |
| 6. Recognition over recall | 3/5 | Day chips and color pickers are good; swipe gesture is recall-based |
| 7. Flexibility and efficiency | 2/5 | No bulk import, no templates, no quick-add shortcut |
| 8. Aesthetic and minimalist design | 4/5 | Clean, well-spaced UI; minor issue with warning contrast on settings |
| 9. Help users recognize, diagnose, recover from errors | 2/5 | Validation errors exist; notification failures are silent |
| 10. Help and documentation | 1/5 | No in-app help, no tooltips, no onboarding |

**Overall Score: 25/50** — The app has strong visual design (heuristic 8) and reasonable error prevention (5), but fails on discoverability, user control, and system status visibility.

---

## Section 8: Summary of All Recommended Changes

**Structural / Navigation:**
- Add 3-screen onboarding flow with persistent "hasOnboarded" flag
- Rename "Week" tab to "Schedule" or "Timetable"
- Fix empty home screen to distinguish "no lectures exist" vs "no lectures today"
- Add "next upcoming lecture" preview card when today has no classes
- Intercept back navigation on all forms when form is dirty

**Trust & Feedback:**
- Fix Notifications screen to show real scheduled notification data
- Add concrete notification preview ("Your next reminder: Monday at 8:45 AM")
- Add calendar sync status indicator in Settings
- Warn when saving items with past dates/times
- Add visible "Test Notification" button on home screen

**Interaction & Accessibility:**
- Increase header button tap targets to 44×44pt minimum
- Add long-press context menu as alternative to swipe on lecture cards
- Improve swipe-to-delete threshold to require 60%+ card width
- Extend UndoToast window to 6–8 seconds
- Add undo capability for assignment completion

**Data & Forms:**
- Add duplicate lecture detection and warning
- Add CSV/ICS timetable import
- Rename "Clear All Lectures" to "End Semester" and move to a "Danger Zone"
- Add per-assignment undo for mark-complete action
- Clarify what Priority means on assignment cards

**Android-Specific:**
- Add right-arrow icon alongside "Cancel" text on Android
- Ensure 48×48dp minimum tap targets (Material Design)
- Handle Android system back button correctly on all form screens
- Add Snackbar-style undo alongside toast for Android users

---

*This analysis was conducted through full code review of all screens, contexts, utilities, and component logic, combined with behavioral simulation of 6 distinct user archetypes across all identified interaction paths.*

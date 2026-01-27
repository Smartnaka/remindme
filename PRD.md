# Product Requirements Document (PRD): Lecture Reminder App

## 1. Product Overview
The **Lecture Reminder App** is a task-focused mobile application helping students manage academic schedules. It tracks lectures/exams and ensures attendance via a hybrid notification system.

**Version:** 1.0.0
**Internal Codename:** RemindMe

## 2. Technical Architecture

### 2.1 Core Stack
-   **Framework:** React Native + Expo (Managed Workflow, SDK 54).
-   **Routing:** File-based routing with `expo-router`.
-   **Language:** TypeScript 5.x.
-   **Storage:** `AsyncStorage` (local persistence).
-   **State Management:** React Context (`LectureContext`, `SettingsContext`).

### 2.2 Key Libraries
-   `@tanstack/react-query`: Efficient data fetching and caching for storage operations.
-   `expo-notifications`: Local push notifications.
-   `lucide-react-native`: Modern, diverse icon set.
-   `dayjs`: Date manipulation and formatting.
-   `react-native-ui-datepicker`: Cross-platform date selection.

## 3. Data Dictionary

### 3.1 Lecture Entity
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique identifier | `Date.now().toString()` |
| `courseName` | `string` | Name of the course | 1-100 chars, no HTML/Script tags |
| `dayOfWeek` | `string` | Weekly recurring day | Enum: `Monday`...`Sunday` |
| `startTime` | `string` | Class start time | Format: `HH:MM`, 24hr |
| `endTime` | `string` | Class end time | Format: `HH:MM`, > `startTime`, duration < 12h |
| `location` | `string` | (Optional) Classroom/Hall | Max 200 chars |
| `color` | `string` | (Optional) Hex color | Valid Hex code |
| `notificationId` | `string` | Push notification ID | - |
| `alarmNotificationIds` | `string[]` | Array of alarm IDs (Android) | - |

### 3.2 Settings Entity
| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `notificationOffset` | `number` | `15` | Minutes before class to notify |
| `themeMode` | `string` | `'automatic'` | `'light'` \| `'dark'` \| `'automatic'` |
| `lastNotificationCheckDate` | `string` | `""` | ISO Date of last sync check |

## 4. Feature Specifications

### 4.1 Hybrid Notification System
To ensure reliability across iOS and Android, the app uses a dual-strategy:
1.  **Calendar-Based (Weekly):** Uses `expo-notifications` with a weekly trigger component.
2.  **Alarm-Based (Android Fallback):** Specifically schedules exact alarms (`SCHEDULE_EXACT_ALARM` permission) to bypass battery optimizations on Android devices.
    *   *Logic:* Schedules 4 weeks of exact alarms in advance for every lecture.

### 4.2 Lecture Management Flow
**User Action: Adding a Lecture**
1.  User taps "Add (+)" button.
2.  **Input:** Enters "Course Name" (Required).
3.  **Input:** Selects "Day of Week" (Chips UI).
4.  **Input:** Picks "Start Time" and "End Time" (Spinner/Wheel UI).
5.  **Validation:**
    *   Course Name must be 1-100 characters.
    *   End Time must be strictly *after* Start Time.
    *   Duration cannot exceed 12 hours.
    *   No restricted characters (`<`, `>`, `{`, `}`).
6.  **Success:** Lecture saved to `AsyncStorage` -> Notifications Scheduled -> Haptic `Success` feedback -> Navigate Back.
7.  **Failure:** Alert dialog with specific error message -> Haptic `Error` feedback.

### 4.3 Theme System
-   **Automatic:** Follows system preference (`useColorScheme`).
-   **Manual Override:** User can toggle between Light/Dark in Settings.
-   **Colors:**
    *   *Primary:* `#007AFF` (Blue)
    *   *Background (Light):* `#F2F2F7` (System Gray 6)
    *   *Background (Dark):* `#000000`
    *   *Card (Light):* `#FFFFFF`
    *   *Card (Dark):* `#1C1C1E`

## 5. User Interface & Permissions

### 5.1 Deep Linking
-   **Scheme:** `remindme://`
-   **Router Origin:** `https://remindme.com/`

### 5.2 Required Permissions
1.  `READ_CALENDAR / WRITE_CALENDAR`: For syncing with system calendar (future roadmap).
2.  `SCHEDULE_EXACT_ALARM`: Critical for Android notification reliability.
3.  `USE_EXACT_ALARM`: Companion permission for Android 12+.

## 6. Known Constraints & Edge Cases
-   **Notification Limits:** varied reliability on Chinese OEM Android ROMs (Xiaomi/Oppo) due to aggressive battery killing.
-   **Storage:** `AsyncStorage` has a 6MB (default) limit on Android, sufficient for thousands of lectures.
-   **Timezones:** Currently handles local time only. Creating a lecture in one timezone and moving to another will shift the reminder time relative to system clock.

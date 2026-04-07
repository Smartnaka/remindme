# RemindMe 🎓

> **Version:** 1.2.0

A modern, intuitive mobile application built with **React Native** and **Expo** to help students manage their academic schedules, exams, and assignments.

**Never miss a lecture again** — RemindMe uses a smart hybrid notification system (Calendar + Alarm) that works reliably across iOS and Android.

## ✨ Features

- **📅 Smart Scheduling**: Add and organize weekly and bi-weekly lectures, track assignments with due dates, and manage upcoming exams.
- **🔔 Advanced Hybrid Reminders**:
  - _Cross-Platform:_ Local notifications for iOS and exact alarms for Android.
  - _Customizable offsets:_ Choose how far in advance to be notified for classes, assignments, and exams.
  - _Semester limits:_ Notifications are automatically silenced outside your class term.
  - _Daily summary:_ A morning brief of the day's classes and assignments.
- **⏱️ Study Timer**: Built-in Pomodoro-style study timer with a live status bar.
- **🎨 Personalization**:
  - Assign custom colors to courses for quick visual identification.
  - `Light` / `Dark` / `Automatic` themes.
  - `Reduce Motion` support for accessible screen transitions.
- **💾 Complete Data Control**:
  - Offline-first architecture using local storage.
  - Export all app data (Lectures, Exams, Assignments, Settings) to JSON.
  - Safely clear data when a semester ends.
- **⚡ Haptic UI**: Tactile feedback for saving, errors, and selection events.
- **🎉 Onboarding**: First-launch carousel to get new users up to speed quickly.

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Framework | [React Native](https://reactnative.dev/) |
| Platform | [Expo SDK 54](https://expo.dev/) (Managed Workflow) |
| Routing | `expo-router` (file-based navigation) |
| State Management | React Context API |
| Data Persistence | `@react-native-async-storage/async-storage` |
| Date Handling | `dayjs` |
| Icons | `lucide-react-native` |
| Styling | `StyleSheet` with custom design tokens |

## 📂 Project Structure

```
/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Bottom-tab navigation
│   │   ├── index.tsx           # Today / upcoming lectures
│   │   ├── week.tsx            # Weekly schedule view
│   │   ├── exams.tsx           # Exams & assignments tracker
│   │   └── settings.tsx        # App preferences
│   ├── add-lecture.tsx         # Create / edit a lecture
│   ├── add-assignment.tsx      # Create / edit an assignment
│   ├── add-exam.tsx            # Create / edit an exam
│   ├── notifications.tsx       # Notification history
│   ├── study-timer.tsx         # Study / Pomodoro timer
│   └── modal.tsx               # Generic modal screen
├── components/                 # Reusable UI components
│   ├── LectureCard.tsx         # Display card for a lecture
│   ├── ExamCard.tsx            # Display card for an exam
│   ├── LiveLectureCard.tsx     # Real-time in-progress lecture card
│   ├── NextLectureCard.tsx     # Upcoming lecture preview
│   ├── SwipeableLectureRow.tsx # Swipe-to-delete lecture row
│   ├── ColorPicker.tsx         # Custom color selection grid
│   ├── MiniTimerBar.tsx        # Persistent study timer status bar
│   ├── OnboardingCarousel.tsx  # First-launch onboarding slides
│   ├── ConfettiCelebration.tsx # Celebration animation
│   └── ...
├── contexts/                   # Global state (React Context)
│   ├── LectureContext.tsx      # Lecture CRUD & notification scheduling
│   ├── ExamContext.tsx         # Exam state management
│   ├── SettingsContext.tsx     # Theme & user preferences
│   ├── StudyTimerContext.tsx   # Study timer state
│   └── AlertContext.tsx        # In-app alert/toast state
├── constants/                  # App-wide constants
│   └── Colors.ts               # Light/Dark mode color tokens
├── types/                      # TypeScript type definitions
│   └── lecture.ts              # Data models (Lecture, DayOfWeek, …)
├── utils/                      # Pure helper functions
│   ├── notifications.ts        # Notification scheduling logic
│   ├── validation.ts           # Input validation rules
│   ├── assignmentUtils.ts      # Assignment helper functions
│   ├── calendar.ts             # Calendar integration helpers
│   └── dateTime.ts             # Date/time formatting utilities
└── .npmrc                      # Sets legacy-peer-deps=true
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** LTS
- **Expo Go** installed on your iOS or Android device (for physical device testing)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Smartnaka/remindme.git
   cd remindme
   ```

2. **Install dependencies:**

   > **Note:** The `.npmrc` file in this repo sets `legacy-peer-deps=true` automatically, which is required to resolve a peer-dependency conflict between React 19 and `lucide-react-native`.

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npx expo start
   ```

   | Key | Action |
   |-----|--------|
   | `a` | Open on Android Emulator |
   | `i` | Open on iOS Simulator |
   | QR code | Scan with Expo Go on a physical device |

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS |
| `npm run web` | Start and open in the browser |
| `npm test` | Run the Jest test suite |

## 🧪 Troubleshooting

### `ERESOLVE` / peer dependency error

The `.npmrc` file should handle this automatically. If the error still appears, run:

```bash
npm install --legacy-peer-deps
```

### Notifications not firing on Android

Battery optimization can kill background processes. Make sure to grant the `SCHEDULE_EXACT_ALARM` permission when prompted on first launch.

### "Port already in use"

Another Metro bundler instance is running. Clear the cache with:

```bash
npx expo start --clear
```

## 📌 Planning & QA

- See [Proposed Features & Bug Check Guide](./FEATURES_AND_BUG_CHECKLIST.md) for the roadmap and a reusable pre-release checklist.
- Join the community on [Discord](https://discord.com/invite/czJjHCcA?utm_source=Discord%20Widget&utm_medium=Connect).

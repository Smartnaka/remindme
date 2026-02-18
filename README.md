# Lecture Reminder App 🎓

> **Internal Codename:** RemindMe  
> **Version:** 1.0.0

A modern, intuitive mobile application built with **React Native** and **Expo** to help students manage their academic schedules, exams, and assignments. 

**Core Value Proposition:** Never miss a lecture again with a smart hybrid notification system (Calendar + Alarm) that works reliably across iOS and Android.

## ✨ Features

-   **📅 Smart Scheduling**: Easily add and organize your weekly lecture schedule.
-   **🔔 Hybrid Reminders**: 
    -   *iOS:* Uses native local notifications.
    -   *Android:* Uses exact alarms to bypass battery optimization.
-   **🎨 Color Coded**: Assign custom colors to courses for quick visual identification.
-   **📝 Exam Tracking**: Dedicated section to keep track of upcoming exams.
-   **🌓 Theme System**: 
    -   `Light` / `Dark` modes.
    -   `Automatic` mode that syncs with system settings.
-   **⚡ Haptic UI**: Tactile interactions for saving, errors, and selection events.

## 🛠️ Technical Stack

-   **Framework**: [React Native](https://reactnative.dev/)
-   **Platform**: [Expo SDK 54](https://expo.dev/) (Managed Workflow)
-   **Routing**: `expo-router` (File-based navigation)
-   **State Management**: React Context (`LectureContext`, `SettingsContext`)
-   **Data Persistence**: `@react-native-async-storage/async-storage`
-   **Date Handling**: `dayjs`
-   **Styling**: `StyleSheet` with custom design tokens.

## 📂 Project Structure

```bash
/
├── app/                    # Expo Router pages (screens)
│   ├── (tabs)/             # Main tab navigation (index, week, exams, settings)
│   ├── add-lecture.tsx     # Screen for creating/editing lectures
│   ├── notifications.tsx   # Notification history view
│   └── ...
├── components/             # Reusable UI components
│   ├── ColorPicker.tsx     # Custom color selection grid
│   ├── LectureCard.tsx     # Display card for individual lectures
│   └── ...
├── contexts/               # Global State logic
│   ├── LectureContext.tsx  # Handles storage, CRUD, and Notification scheduling
│   └── SettingsContext.tsx # Handles Theme and User Preferences
├── constants/              # App-wide constants
│   ├── Colors.ts           # Light/Dark mode color tokens
│   └── ...
├── types/                  # TypeScript definitions
│   ├── lecture.ts          # Data models (Lecture, DayOfWeek)
│   └── ...
├── utils/                  # Helper logic
│   ├── validation.ts       # Input validation rules
│   └── notifications.ts    # Complex notification scheduling logic
└── .npmrc                  # Configuration for legacy peer dependencies
```

## 🚀 Getting Started

### Prerequisites

-   **Node.js**: (LTS version recommended)
-   **Expo Go**: Installed on your physical device (iOS/Android).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd lecture-reminder-app
    ```

2.  **Install dependencies:**
    > **IMPORTANT:** This project relies on an `.npmrc` file to set `legacy-peer-deps=true`. This is required to resolve a conflict between `React 19` and `lucide-react-native`.
    
    ```bash
    npm install
    # OR if you prefer to be explicit
    npm install --legacy-peer-deps
    ```

3.  **Start the server:**
    ```bash
    npx expo start
    ```
    -   Press `a` to run on Android Emulator.
    -   Press `i` to run on iOS Simulator.
    -   Scan the QR code with Expo Go to run on physical device.

## 🔧 Scripts

-   `npm start`: specific alias for `expo start`.
-   `npm run android`: specific alias for `expo start --android`.
-   `npm run ios`: specific alias for `expo start --ios`.
-   `npm run web`: specific alias for `expo start --web`.

## 🧪 Troubleshooting

### 1. `ERESOLVE` or Peer Dependency Error
If you see an error about `lucide-react-native` and `react@19`:
-   **Fix:** Ensure the `.npmrc` file exists in the root directory with `legacy-peer-deps=true`.
-   **Manual Fix:** Run `npm install --legacy-peer-deps`.

### 2. Notifications not firing on Android
-   **Cause:** Battery optimization often kills background processes.
-   **Fix:** This app requests `SCHEDULE_EXACT_ALARM` permissions. Ensure you grant it notifications access when prompted on the first launch.

### 3. "Port already in use"
-   **Cause:** Another Metro bundler instance is running.
-   **Fix:** Run `npx expo start --clear` to reset the cache and use a new port.

## 📌 Planning & QA

- See [Proposed Features & Bug Check Guide](./FEATURES_AND_BUG_CHECKLIST.md) for roadmap ideas and a reusable pre-release checklist.

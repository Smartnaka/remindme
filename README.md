# RemindMe 🎓

**RemindMe** is a sleek, intelligent lecture scheduling assistant designed to help students never miss a class. Built with React Native and Expo, it combines a beautiful "Apple-style" native aesthetic with robust notification features.

![App Icon](./assets/images/icon.png)

## ✨ Features

-   **📅 Weekly Schedule**: Visual week view with color-coded classes.
-   **🔔 Smart Notifications**: Alerts 15 minutes before class (configurable).
-   **📆 Calendar Sync**: One-tap sync to system Calendar (iOS/Android) for reliable alarms.
-   **👆 Swipe Actions**: Intuitive swipe-to-delete gestures.
-   **🌑 Dark Mode**: Fully supported "Premium Dark" theme for OLED screens.
-   **⚡ Offline First**: All data is stored locally on your device.

## 🛠 Tech Stack

-   **Framework**: [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 51)
-   **Routing**: Expo Router (File-based routing)
-   **State Management**: React Context + TanStack Query (React Query)
-   **Storage**: `@react-native-async-storage/async-storage`
-   **Styling**: Native StyleSheet + Custom Design System
-   **Icons**: Ionicons / Lucide React Native
-   **Fonts**: Inter (Google Fonts)

## 🚀 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/remindme.git
    cd remindme
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Run the app**:
    ```bash
    npx expo start
    ```

4.  **Open on device**:
    -   Scan the QR code with the **Expo Go** app (Android) or Camera (iOS).
    -   Press `a` for Android Emulator or `i` for iOS Simulator.

## 📖 Project Structure

```bash
app/
├── (tabs)/          # Main tab screens (Today, Week, Settings)
├── lecture/         # Lecture detail screens
├── _layout.tsx      # Root layout & providers
└── notifications.tsx # Notification management
components/          # Reusable UI components (SwipeableLectureRow, CourseItem)
contexts/            # Global state (LectureContext, SettingsContext)
constants/           # Design tokens (Colors, Theme)
utils/               # Logic helpers (DateTime, Notifications, Calendar)
assets/              # Images and icons
```

## 🗺 Roadmap

-   [x] Core Scheduling & Notifications
-   [x] Dark Mode
-   [x] System Calendar Integration
-   [x] Swipe Gestures
-   [ ] Course Color Coding
-   [ ] Assignments & Exam Tracking
-   [ ] Cloud Backup

---

*Built with ❤️ for students.*

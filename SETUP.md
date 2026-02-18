# Setup Guide - Lecture Reminder App

## Prerequisites

- **Node.js** (LTS recommended) - [Download](https://nodejs.org/)
- **Expo Go** app installed on your iOS/Android device.

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd lecture-reminder-app
   ```

2. **Install dependencies:**
   This project uses `npm`.

   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator
   - Scan QR code with **Expo Go** for physical device

## Project Structure

- **framework**: React Native (Expo SDK 54)
- **router**: Expo Router
- **styling**: Standard StyleSheet
- **types**: TypeScript

## Troubleshooting

### "Peer Dependency" or "React 19" Errors

We use an `.npmrc` file to automatically handle `legacy-peer-deps`. If you still face issues, run:

```bash
npm install --legacy-peer-deps
```

### Missing Assets

Ensure `assets/images/` contains:

- `icon.png`
- `splash-icon.png`
- `adaptive-icon.png`
- `favicon.png`

### Resetting Cache

If you encounter inexplicable errors:

```bash
npx expo start --clear
```

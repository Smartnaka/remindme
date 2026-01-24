# Setup Guide - Lecture Reminder App

## What Was Missing

1. ✅ **package.json** - Created with all required dependencies
2. ⚠️ **Assets folder** - Created structure, but you need to add image files
3. ⚠️ **node_modules** - Will be created after installing dependencies
4. ⚠️ **Metro config dependency** - May need adjustment (see below)

## Step-by-Step Setup Instructions

### 1. Install Node.js and Bun (if not already installed)

According to the README, this project uses Bun. Install it:
- **Node.js**: Download from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
- **Bun**: Install from [bun.sh](https://bun.sh/docs/installation)

### 2. Install Dependencies

Open a terminal in this project directory and run:

```bash
bun install
```

**OR** if you prefer npm:

```bash
npm install
```

### 3. Add Missing Assets

The app requires these image files in `assets/images/`:
- `icon.png` - App icon (1024x1024 recommended)
- `splash-icon.png` - Splash screen icon
- `adaptive-icon.png` - Android adaptive icon (foreground)
- `favicon.png` - Web favicon

**Quick fix**: You can create placeholder images or download free icons from:
- [Flaticon](https://www.flaticon.com/)
- [Icons8](https://icons8.com/)
- Or use any 1024x1024 PNG image temporarily

### 4. Potential Metro Config Issue

The `metro.config.js` uses `@rork-ai/toolkit-sdk/metro` which might not be publicly available. If you get an error during installation, you may need to:

**Option A**: Remove the Rork-specific metro config and use standard Expo config:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
module.exports = getDefaultConfig(__dirname);
```

**Option B**: If the package exists, ensure it's properly installed.

### 5. Start the Development Server

After installing dependencies:

```bash
# For web preview (easiest to start)
bun run start-web

# OR for mobile development
bun run start
# Then press 'i' for iOS simulator or 'a' for Android emulator
```

### 6. Test on Your Phone

1. Install **Expo Go** app on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Run `bun run start` and scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

## Troubleshooting

### Error: Cannot find module '@rork-ai/toolkit-sdk'
- This package might be private or not available
- Solution: Update `metro.config.js` to use standard Expo config (see Step 4)

### Error: Missing assets
- Make sure all image files exist in `assets/images/`
- Check file names match exactly what's in `app.json`

### Error: Module not found
- Delete `node_modules` folder
- Run `bun install` or `npm install` again
- Clear cache: `bunx expo start --clear`

### App won't start
- Make sure you're using Node.js 18+ and Bun latest version
- Check that all dependencies installed successfully
- Try: `bunx expo start --clear`

## Dependencies Installed

The following packages are included in `package.json`:
- **Expo SDK 51** - Core framework
- **Expo Router** - File-based routing
- **React Query** - State management
- **AsyncStorage** - Local data persistence
- **Expo Notifications** - Push notifications
- **Lucide React Native** - Icons
- **React Native Gesture Handler** - Touch gestures
- **Safe Area Context** - Safe area handling

## Next Steps

1. ✅ Install dependencies (`bun install`)
2. ✅ Add image assets to `assets/images/`
3. ✅ Fix metro config if needed (see Step 4)
4. ✅ Start the app (`bun run start-web` or `bun run start`)
5. ✅ Test on your device with Expo Go

## Need Help?

- Check the main [README.md](./README.md) for more details
- Expo docs: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/

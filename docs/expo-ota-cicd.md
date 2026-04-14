# Expo OTA CI/CD + Next.js Notification Backend (Preview Branch)

This is the full step-by-step setup for RemindMe using the **`preview`** EAS update branch.

## End-to-end flow

1. You push to `main`.
2. GitHub Action runs `eas update --branch preview`.
3. GitHub dispatches `notify-app-update.yml`.
4. Notify workflow calls your backend endpoint.
5. Backend broadcasts Expo push notifications to all stored tokens.
6. User taps notification.
7. App detects `actionType: "update"`, opens update modal, fetches and reloads.

---

## 1) Manual setup in Expo

### 1.1 Install and login

```bash
npm install -g eas-cli
eas login
eas whoami
```

### 1.2 Configure update/build once in this repo

```bash
eas update:configure
eas build:configure
```

### 1.3 Confirm `preview` branch exists

You can create/use it on first publish, but we recommend validating with:

```bash
eas branch:list
eas channel:list
```

If needed, map your channel to `preview` according to your release strategy.

---

## 2) Manual setup in GitHub (Secrets + Actions)

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

Add these repository secrets:

- `EXPO_TOKEN`
  - Generate from Expo account (token used by CI).
- `APP_ACTIONS_SECRET`
  - Random long secret string; same value must exist in backend env.
- `API_URL`
  - Base URL for backend, e.g. `https://api.remindme.app` (no trailing slash preferred).
  - If you store a full endpoint URL by mistake, workflow now normalizes it automatically.

### Verify workflows are present

- `.github/workflows/eas-update.yml`
- `.github/workflows/notify-app-update.yml`

`eas-update.yml` now publishes to `preview` and triggers notify workflow.

---

## 3) Manual backend setup (Next.js)

Create route:

`app/api/notify-app-update/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { sendPushNotificationToAllUsers } from "@/server/notifications";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-github-actions-secret");
    const expectedSecret = process.env.APP_ACTIONS_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { message, platform, branch } = body;

    const result = await sendPushNotificationToAllUsers({
      title: "RemindMe Update Available 🚀",
      body: message || "A new version is available. Open the app to update.",
      sound: "default",
      data: {
        actionType: "update",
        platform: platform || "android",
        branch: branch || "preview",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ...result,
      message: "Update notifications sent",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### Backend env vars

In backend environment (Vercel/Render/Fly/etc), set:

```env
APP_ACTIONS_SECRET=the-exact-same-secret-from-github
```

Deploy backend after adding this.

---

## 4) Manual push-broadcast implementation

Install package in backend project:

```bash
npm install expo-server-sdk
```

Add a notification service:

```ts
import { Expo } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotificationToAllUsers(payload: {
  title: string;
  body: string;
  sound?: "default";
  data?: Record<string, unknown>;
}) {
  const tokens = await getAllExpoPushTokensFromDb();

  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: payload.sound ?? "default",
      data: payload.data ?? {},
    }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }

  return { sent: messages.length };
}

async function getAllExpoPushTokensFromDb(): Promise<string[]> {
  // TODO: implement with your DB
  return [];
}
```

### Token lifecycle checklist

- Save Expo token when app registers notifications.
- Upsert token by user/device.
- Mark invalid tokens inactive when Expo returns `DeviceNotRegistered`.

---

## 5) Manual production-device test plan

### 5.1 Backend endpoint test (before CI)

```bash
curl -X POST "$API_URL/api/notify-app-update" \
  -H "Content-Type: application/json" \
  -H "x-github-actions-secret: $APP_ACTIONS_SECRET" \
  -d '{"message":"Manual test","platform":"android","branch":"preview"}'
```

Expected: HTTP 200 and notification broadcast.

### 5.2 Build installable app

```bash
eas build --platform android --profile production
```

Install on real device.

### 5.3 Trigger notify workflow manually

1. GitHub → Actions → **Notify App Update**.
2. Click **Run workflow**.
3. Set message/platform/branch (`preview`).
4. Run and watch logs for HTTP 200.

### 5.4 Full CI flow test

1. Commit/push JS-only change to `main`.
2. Watch **EAS Update** workflow publish to `preview`.
3. Confirm it dispatches **Notify App Update**.
4. Receive notification on real device.
5. Tap notification.
6. Confirm update modal opens.
7. Tap **Update now**.
8. Confirm app reloads with latest code.

---

## 6) Known constraints

- OTA works for JavaScript/assets changes only.
- Native code changes still require new `eas build` + store release.
- Keep `if (__DEV__) return;` guard for `expo-updates` checks.

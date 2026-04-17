import { useAppUpdate } from "@/contexts/AppUpdateContext";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isUpdateAction = (actionType: unknown): boolean => actionType === "update";

const LAST_HANDLED_NOTIFICATION_KEY = "@lastHandledUpdateNotificationId";

export default function useLinking() {
  const { checkForUpdates } = useAppUpdate();

  useEffect(() => {
    const handleNotificationResponse = async (
      response: Notifications.NotificationResponse | null | undefined,
      isFromListener: boolean = false
    ) => {
      if (!response) return;

      const actionType = response.notification.request.content.data?.actionType;
      if (!isUpdateAction(actionType)) return;

      const notificationId = response.notification.request.identifier;

      if (!isFromListener) {
        // For getLastNotificationResponseAsync, deduplicate by ID so a stale
        // tap does not re-trigger checkForUpdates on every subsequent app open
        // after the update has already been applied.
        const lastHandledId = await AsyncStorage.getItem(LAST_HANDLED_NOTIFICATION_KEY);
        if (lastHandledId === notificationId) return;
        await AsyncStorage.setItem(LAST_HANDLED_NOTIFICATION_KEY, notificationId);
      }

      await checkForUpdates(true);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) =>
      handleNotificationResponse(response, false)
    );

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response, true);
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdates]);
}

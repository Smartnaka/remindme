import { useAppUpdate } from "@/contexts/AppUpdateContext";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

const isUpdateAction = (actionType: unknown): boolean => actionType === "update";

export default function useLinking() {
  const { checkForUpdates } = useAppUpdate();

  useEffect(() => {
    const handleNotificationResponse = async (
      response: Notifications.NotificationResponse | null | undefined
    ) => {
      if (!response) return;

      const actionType = response.notification.request.content.data?.actionType;
      if (isUpdateAction(actionType)) {
        await checkForUpdates(true);
      }
    };

    void Notifications.getLastNotificationResponseAsync().then(handleNotificationResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdates]);
}

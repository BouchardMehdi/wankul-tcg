import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { readAppSettings, subscribeAppSettings } from "../utils/appSettings";
import {
  getPwaNotificationPermission,
  subscribeCurrentBrowserToPush,
  unsubscribeCurrentBrowserFromPush,
} from "../utils/pwaNotifications";

export default function PwaNotificationManager() {
  const { isAuthenticated, token } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => readAppSettings().pwaNotifications,
  );

  useEffect(
    () =>
      subscribeAppSettings(() => {
        setNotificationsEnabled(readAppSettings().pwaNotifications);
      }),
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!notificationsEnabled) {
      void unsubscribeCurrentBrowserFromPush(token).catch(() => undefined);
      return;
    }

    if (getPwaNotificationPermission() !== "granted") {
      return;
    }

    void subscribeCurrentBrowserToPush(token).catch(() => undefined);
  }, [isAuthenticated, notificationsEnabled, token]);

  return null;
}

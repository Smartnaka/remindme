import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Updates from "expo-updates";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type AppUpdateContextType = {
  checkForUpdates: (alertFeedback?: boolean) => Promise<void>;
  isChecking: boolean;
};

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const AppUpdateContext = createContext<AppUpdateContextType | null>(null);

export const useAppUpdate = (): AppUpdateContextType => {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error("useAppUpdate must be used within AppUpdateProvider");
  }
  return context;
};

export const AppUpdateProvider = ({ children }: { children: React.ReactNode }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkForUpdates = useCallback(async (_alertFeedback: boolean = false) => {
    if (__DEV__) return;

    setIsChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.warn("[AppUpdate] Failed to check for updates", error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleExpoUpgrade = useCallback(async () => {
    if (__DEV__) return;

    setIsUpdating(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setIsModalOpen(false);
        return;
      }

      await Updates.fetchUpdateAsync();
      setIsModalOpen(false);

      await new Promise((resolve) => setTimeout(resolve, 300));
      await Updates.reloadAsync();
    } catch (error) {
      console.warn("[AppUpdate] Failed to apply update", error);
      setIsModalOpen(false);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    if (__DEV__) return;

    const interval = setInterval(() => {
      void checkForUpdates(false);
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  const value = useMemo(
    () => ({
      checkForUpdates,
      isChecking,
    }),
    [checkForUpdates, isChecking]
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Update available</Text>
            <Text style={styles.subtitle}>
              A new version of RemindMe is ready. Update now for the latest fixes and improvements.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, isUpdating && styles.primaryButtonDisabled]}
              onPress={() => void handleExpoUpgrade()}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Update now</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setIsModalOpen(false)}
              disabled={isUpdating}
            >
              <Text style={styles.secondaryButtonText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppUpdateContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "500",
  },
});

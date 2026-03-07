import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';
import { useCustomAlert } from '@/contexts/AlertContext';

export default function CustomAlert() {
  const { alertState, hideAlert } = useCustomAlert();
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!alertState.visible) return null;

  const handleAction = (onPress?: () => void) => {
    hideAlert();
    if (onPress) {
      setTimeout(onPress, 300); // Wait for modal disappear animation
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={alertState.visible}
      onRequestClose={() => {
        if (alertState.cancelable !== false) hideAlert();
      }}
    >
      <TouchableWithoutFeedback onPress={() => {
        if (alertState.cancelable !== false) hideAlert();
      }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertBox}>
              <Text style={styles.title}>{alertState.title}</Text>
              {alertState.message && (
                <Text style={styles.message}>{alertState.message}</Text>
              )}
              
              <View style={styles.buttonContainer}>
                {alertState.actions.length === 2 ? (
                  // Side-by-side buttons for 2 actions (e.g. Cancel / OK)
                  <View style={styles.rowButtons}>
                    {alertState.actions.map((action, index) => (
                      <React.Fragment key={index}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rowButton]}
                          onPress={() => handleAction(action.onPress)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.buttonText,
                            action.style === 'cancel' && styles.buttonTextCancel,
                            action.style === 'destructive' && styles.buttonTextDestructive,
                            action.style === 'default' && (index === 1 ? styles.buttonTextBold : {}),
                          ]}>
                            {action.text}
                          </Text>
                        </TouchableOpacity>
                        {index === 0 && <View style={styles.verticalDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                ) : (
                  // Stacked buttons for 1 or 3+ actions
                  <View style={styles.stackedButtons}>
                    {alertState.actions.map((action, index) => (
                      <View key={index} style={{ width: '100%' }}>
                        {index > 0 && <View style={styles.horizontalDivider} />}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleAction(action.onPress)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.buttonText,
                            action.style === 'cancel' && styles.buttonTextCancel,
                            action.style === 'destructive' && styles.buttonTextDestructive,
                            action.style === 'default' && styles.buttonTextBold, // bold for stacked
                          ]}>
                            {action.text}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 270,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 13,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  buttonContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textMuted + '50',
  },
  rowButtons: {
    flexDirection: 'row',
    height: 44,
  },
  stackedButtons: {
    flexDirection: 'column',
    width: '100%',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  rowButton: {
    flex: 1,
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.textMuted + '50',
    height: '100%',
  },
  horizontalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textMuted + '50',
    width: '100%',
  },
  buttonText: {
    fontSize: 17,
    color: colors.primary,
  },
  buttonTextBold: {
    fontWeight: '600',
  },
  buttonTextCancel: {
    fontWeight: '400',
  },
  buttonTextDestructive: {
    color: colors.error,
  },
});

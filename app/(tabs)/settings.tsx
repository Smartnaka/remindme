import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Switch,
  Linking,
  Pressable,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { useLectures } from '@/contexts/LectureContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';
import Constants from 'expo-constants';
import { useCustomAlert } from '@/contexts/AlertContext';

const NOTIFICATION_OPTIONS = [5, 10, 15, 30, 45, 60];
const EXAM_NOTIFICATION_OPTIONS = [15, 30, 60, 120, 1440];

type PickerType = 'lecture' | 'assignment' | 'exam' | null;

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

interface SwitchRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  subtitle?: string;
  value?: boolean;
  onValueChange: (value: boolean) => void;
}

interface SectionProps {
  title: string;
  caption?: string;
  children: React.ReactNode;
}

export default function SettingsScreen() {
  const { settings, updateSettings, colors } = useSettings();
  const { clearLectures, clearAssignments } = useLectures();
  const { clearExams } = useExams();
  const { showAlert } = useCustomAlert();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [manageDataModalVisible, setManageDataModalVisible] = useState(false);
  const [showSummaryPicker, setShowSummaryPicker] = useState(false);
  const [showSemesterStartPicker, setShowSemesterStartPicker] = useState(false);
  const [showSemesterEndPicker, setShowSemesterEndPicker] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<PickerType>(null);

  const styles = useMemo(() => createStyles(colors, bottomInset), [colors, bottomInset]);

  const handleOffsetChange = (type: 'lecture' | 'assignment' | 'exam', minutes: number) => {
    if (type === 'lecture') updateSettings({ lectureOffset: minutes });
    if (type === 'assignment') updateSettings({ assignmentOffset: minutes });
    if (type === 'exam') updateSettings({ examOffset: minutes });
  };

  const handleSummaryTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowSummaryPicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      updateSettings({ dailySummaryTime: `${hours}:${minutes}` });
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    }
  };

  const handleOpenPicker = (type: 'lecture' | 'assignment' | 'exam') => {
    setPickerType(type);
    setPickerVisible(true);
  };

  const handleSelectOption = (minutes: number) => {
    if (pickerType) handleOffsetChange(pickerType, minutes);
    setPickerVisible(false);
    setPickerType(null);
  };

  const getSummaryDate = () => {
    const [hours, minutes] = (settings.dailySummaryTime || '07:00').split(':').map(Number);
    const d = new Date();
    d.setHours(hours || 7, minutes || 0, 0, 0);
    return d;
  };

  const getSemesterDate = (dateStr?: string) => (dateStr ? new Date(dateStr) : new Date());

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSemesterStartChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowSemesterStartPicker(false);
    if (selectedDate) updateSettings({ semesterStart: selectedDate.toISOString() });
  };

  const handleSemesterEndChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowSemesterEndPicker(false);
    if (selectedDate) updateSettings({ semesterEnd: selectedDate.toISOString() });
  };

  const handleExportData = async () => {
    try {
      const keys = ['@settings', '@lectures', '@assignments', '@exams'];
      const [settingsData, lecturesData, assignmentsData, examsData] = await Promise.all(
        keys.map((k) => AsyncStorage.getItem(k))
      );
      const exportPayload = {
        settings: settingsData ? JSON.parse(settingsData) : {},
        lectures: lecturesData ? JSON.parse(lecturesData) : [],
        assignments: assignmentsData ? JSON.parse(assignmentsData) : [],
        exams: examsData ? JSON.parse(examsData) : [],
        exportedAt: new Date().toISOString(),
      };
      const docDir = (FileSystem as any).documentDirectory || '';
      const fileUri = `${docDir}RemindMe_Export.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportPayload, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        showAlert('Error', 'Sharing is not available on this device', [{ text: 'OK' }]);
      }
    } catch (e) {
      console.error('Failed to export data', e);
      showAlert('Export Failed', 'Could not export app data.', [{ text: 'OK' }]);
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(hours || 7, minutes || 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 1440) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
    if (minutes >= 60) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
    return `${minutes} min`;
  };

  const Section = ({ title, caption, children }: SectionProps) => (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );

  const SettingRow = ({
    icon,
    iconBg,
    label,
    subtitle,
    value,
    onPress,
    rightElement,
    destructive,
  }: SettingRowProps) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
      onPress={() => {
        if (!onPress) return;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}
      disabled={!onPress}
      android_ripple={{ color: `${colors.primary}15` }}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}> 
          <Ionicons name={icon} size={16} color={destructive ? colors.error : colors.textDark} />
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowLabel, destructive && { color: colors.error }]}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtext}>{subtitle}</Text> : null}
        </View>
      </View>

      {rightElement ? (
        rightElement
      ) : (
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </View>
      )}
    </Pressable>
  );

  const SwitchRow = ({ icon, iconBg, label, subtitle, value, onValueChange }: SwitchRowProps) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}> 
          <Ionicons name={icon} size={16} color={colors.textDark} />
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtext}>{subtitle}</Text> : null}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={(val) => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onValueChange(val);
        }}
        trackColor={{ false: `${colors.textMuted}35`, true: `${colors.primary}85` }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Personalize reminders, data, and app behavior.</Text>
        </View>

        <Section title="Preferences">
          <View style={styles.rowGroupTitleWrap}>
            <Text style={styles.rowGroupTitle}>Appearance</Text>
          </View>

          <View style={styles.rowTheme}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}> 
                <Ionicons name="color-palette-outline" size={16} color={colors.textDark} />
              </View>
              <Text style={styles.rowLabel}>Theme</Text>
            </View>

            <View style={styles.segmentedControl}>
              {(['automatic', 'light', 'dark'] as const).map((mode) => {
                const isActive = settings.themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      updateSettings({ themeMode: mode });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                      {mode === 'automatic' ? 'Auto' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          <SwitchRow
            icon="sparkles-outline"
            iconBg={`${colors.primary}1a`}
            label="Reduce Motion"
            subtitle="Use fewer animated transitions"
            value={settings.reduceMotion}
            onValueChange={(val) => updateSettings({ reduceMotion: val })}
          />
        </Section>

        <Section title="Scheduling" caption="Notifications only fire within these dates.">
          <SettingRow
            icon="calendar-outline"
            iconBg={`${colors.primary}1a`}
            label="Semester Start"
            value={formatDate(settings.semesterStart)}
            onPress={() => setShowSemesterStartPicker(true)}
          />
          {showSemesterStartPicker && (
            <DateTimePicker
              value={getSemesterDate(settings.semesterStart)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleSemesterStartChange}
            />
          )}

          <View style={styles.divider} />

          <SettingRow
            icon="calendar-clear-outline"
            iconBg={`${colors.primary}1a`}
            label="Semester End"
            value={formatDate(settings.semesterEnd)}
            onPress={() => setShowSemesterEndPicker(true)}
          />
          {showSemesterEndPicker && (
            <DateTimePicker
              value={getSemesterDate(settings.semesterEnd)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleSemesterEndChange}
            />
          )}
        </Section>

        <Section title="Reminders">
          <SettingRow
            icon="notifications-outline"
            iconBg={`${colors.primary}1a`}
            label="Lecture Reminder"
            value={`${formatDuration(settings.lectureOffset)} before`}
            onPress={() => handleOpenPicker('lecture')}
          />
          <View style={styles.divider} />

          <SettingRow
            icon="document-text-outline"
            iconBg={`${colors.primary}1a`}
            label="Assignment Reminder"
            value={`${formatDuration(settings.assignmentOffset)} before`}
            onPress={() => handleOpenPicker('assignment')}
          />
          <View style={styles.divider} />

          <SettingRow
            icon="school-outline"
            iconBg={`${colors.primary}1a`}
            label="Exam Reminder"
            value={`${formatDuration(settings.examOffset)} before`}
            onPress={() => handleOpenPicker('exam')}
          />
          <View style={styles.divider} />

          <SwitchRow
            icon="time-outline"
            iconBg={`${colors.primary}1a`}
            label="Notify at Class Start"
            subtitle="Alert when class begins"
            value={settings.notifyAtClassStart}
            onValueChange={(val) => updateSettings({ notifyAtClassStart: val })}
          />
          <View style={styles.divider} />

          <SwitchRow
            icon="sunny-outline"
            iconBg={`${colors.primary}1a`}
            label="Daily Summary"
            subtitle="Morning overview of your day"
            value={settings.dailySummaryEnabled}
            onValueChange={(val) => updateSettings({ dailySummaryEnabled: val })}
          />

          {settings.dailySummaryEnabled && (
            <>
              <View style={styles.divider} />
              <SettingRow
                icon="alarm-outline"
                iconBg={`${colors.primary}1a`}
                label="Summary Time"
                value={formatTime(settings.dailySummaryTime || '07:00')}
                onPress={() => setShowSummaryPicker(true)}
              />
              {showSummaryPicker && (
                <DateTimePicker
                  value={getSummaryDate()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleSummaryTimeChange}
                />
              )}
            </>
          )}
        </Section>

        <Section title="Data">
          <SettingRow
            icon="download-outline"
            iconBg={`${colors.primary}1a`}
            label="Export Data"
            subtitle="Save a local backup file"
            onPress={handleExportData}
          />
          <View style={styles.divider} />

          <SettingRow
            icon="server-outline"
            iconBg={`${colors.primary}1a`}
            label="Manage Data"
            subtitle="Clear classes, assignments, or exams"
            onPress={() => setManageDataModalVisible(true)}
          />
        </Section>

        <Section title="About">
          <SettingRow
            icon="mail-open-outline"
            iconBg={`${colors.primary}1a`}
            label="Feedback & Bug Report"
            subtitle="support@remindme.app"
            onPress={() => Linking.openURL('mailto:support@remindme.app')}
          />
        </Section>

        <Text style={styles.versionText}>RemindMe v{Constants.expoConfig?.version || '1.0.0'}</Text>
        <Text style={styles.builtByText}>Built by Adeoti Israel</Text>
      </ScrollView>

      {/* REMINDER OFFSET PICKER MODAL */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pickerType === 'lecture'
                ? 'Lecture Reminder'
                : pickerType === 'assignment'
                  ? 'Assignment Reminder'
                  : 'Exam Reminder'}
            </Text>

            {(pickerType === 'exam' ? EXAM_NOTIFICATION_OPTIONS : NOTIFICATION_OPTIONS).map((minutes) => {
              const isSelected =
                (pickerType === 'lecture' && settings.lectureOffset === minutes) ||
                (pickerType === 'assignment' && settings.assignmentOffset === minutes) ||
                (pickerType === 'exam' && settings.examOffset === minutes);
              return (
                <TouchableOpacity key={minutes} style={styles.modalOption} onPress={() => handleSelectOption(minutes)}>
                  <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                    {formatDuration(minutes)} before
                  </Text>
                  {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MANAGE DATA MODAL */}
      <Modal
        visible={manageDataModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageDataModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setManageDataModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Data</Text>

            <SettingRow
              icon="trash-outline"
              iconBg={`${colors.error}1a`}
              label="Clear All Classes"
              subtitle="Deletes class schedule and reminders"
              destructive
              onPress={() => {
                setManageDataModalVisible(false);
                setTimeout(() => {
                  showAlert('End Semester?', 'This will remove all classes and reminders. Cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Semester', style: 'destructive', onPress: clearLectures },
                  ]);
                }, 300);
              }}
            />

            <View style={styles.divider} />

            <SettingRow
              icon="trash-outline"
              iconBg={`${colors.error}1a`}
              label="Clear All Assignments"
              subtitle="Deletes all assignment tasks"
              destructive
              onPress={() => {
                setManageDataModalVisible(false);
                setTimeout(() => {
                  showAlert('Delete All Assignments?', 'This will remove all your tasks. Cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => await clearAssignments?.() },
                  ]);
                }, 300);
              }}
            />

            <View style={styles.divider} />

            <SettingRow
              icon="trash-outline"
              iconBg={`${colors.error}1a`}
              label="Clear All Exams"
              subtitle="Deletes all exam schedules"
              destructive
              onPress={() => {
                setManageDataModalVisible(false);
                setTimeout(() => {
                  showAlert('Delete All Exams?', 'This will remove all exam schedules. Cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: clearExams },
                  ]);
                }, 300);
              }}
            />

            <TouchableOpacity style={styles.modalCancel} onPress={() => setManageDataModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTheme, bottomInset: number = 0) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: Math.max(bottomInset + 20, 36),
    },
    heroHeader: {
      paddingHorizontal: 6,
      marginBottom: 10,
    },
    heroTitle: {
      fontSize: 34,
      fontFamily: 'Inter_700Bold',
      color: colors.textDark,
      letterSpacing: -0.7,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    sectionWrap: {
      marginTop: 18,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textMuted,
      marginBottom: 10,
      marginLeft: 6,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sectionCaption: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
      marginTop: 8,
      marginLeft: 6,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.textMuted}20`,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colors.background === '#000000' ? 0.3 : 0.08,
          shadowRadius: 14,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    rowGroupTitleWrap: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    rowGroupTitle: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rowTheme: {
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    row: {
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    rowPressed: {
      backgroundColor: `${colors.primary}0f`,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
      minHeight: 40,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 10,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: colors.textDark,
      lineHeight: 21,
    },
    rowSubtext: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
    },
    rowValue: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: colors.textMuted,
      maxWidth: 150,
      textAlign: 'right',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: `${colors.textMuted}25`,
      marginLeft: 56,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: `${colors.textMuted}12`,
      borderRadius: 11,
      padding: 3,
      gap: 4,
    },
    segmentButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      minWidth: 54,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 2,
        },
        android: { elevation: 1 },
      }),
    },
    segmentText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.textDark,
      fontFamily: 'Inter_600SemiBold',
    },
    versionText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      marginTop: 28,
    },
    builtByText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      marginTop: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.42)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 36 : 22),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: `${colors.textMuted}35`,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textDark,
      marginBottom: 10,
      textAlign: 'center',
    },
    modalOption: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${colors.textMuted}28`,
      paddingHorizontal: 6,
    },
    modalOptionText: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: colors.textDark,
    },
    modalCancel: {
      marginTop: 16,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: `${colors.textMuted}12`,
    },
    modalCancelText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textDark,
    },
  });

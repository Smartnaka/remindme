import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DayOfWeek } from '@/types/lecture';
import { DAYS_OF_WEEK } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddLectureScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { addLecture, updateLecture, getLectureById } = useLectures();
  const { colors } = useSettings();

  const isEditing = Boolean(id);
  const existingLecture = isEditing ? getLectureById(id as string) : null;

  const [courseName, setCourseName] = useState(existingLecture?.courseName || '');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(existingLecture?.dayOfWeek || 'Monday');

  // Keep strings as the source of truth for the logic
  const [startTime, setStartTime] = useState(existingLecture?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingLecture?.endTime || '10:30');

  const [location, setLocation] = useState(existingLecture?.location || '');
  const [isSaving, setIsSaving] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Helper to convert "HH:MM" string to Date object
  const timeStringToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    return date;
  };

  // Helper to format Date object to "HH:MM" string
  const dateToTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setStartTime(dateToTimeString(selectedDate));
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setEndTime(dateToTimeString(selectedDate));
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  const handleSave = async () => {
    if (!courseName.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Missing Information', 'Please enter a course name');
      return;
    }

    if (startTime >= endTime) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setIsSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (isEditing && existingLecture) {
        await updateLecture(existingLecture.id, {
          courseName: courseName.trim(),
          dayOfWeek,
          startTime,
          endTime,
          location: location.trim(),
        });
      } else {
        await addLecture({
          courseName: courseName.trim(),
          dayOfWeek: dayOfWeek,
          startTime,
          endTime,
          location: location.trim(),
        });
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Failed to save lecture');
      setIsSaving(false);
    }
  };

  const handleDaySelect = (day: DayOfWeek) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDayOfWeek(day);
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.customHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Lecture' : 'New Lecture'}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <Text style={styles.label}>Course Name</Text>
              <TextInput
                style={[styles.input, courseName ? styles.inputFilled : null]}
                placeholder="e.g., Computer Science 101"
                placeholderTextColor={colors.textMuted}
                value={courseName}
                onChangeText={setCourseName}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <View style={styles.section}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Select Day</Text>
              </View>
              <View style={styles.dayGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, dayOfWeek === day && styles.dayChipActive]}
                    onPress={() => handleDaySelect(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, dayOfWeek === day && styles.dayChipTextActive]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Class Time</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TouchableOpacity
                    style={styles.timeInputButton}
                    onPress={() => setShowStartPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeInputText}>{startTime}</Text>
                  </TouchableOpacity>
                  {(showStartPicker || (Platform.OS === 'ios' && showStartPicker)) && (
                    <DateTimePicker
                      value={timeStringToDate(startTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                      textColor={colors.textDark}
                    />
                  )}
                  {/* On iOS, we might want a "Done" button if using spinner layout inside a modal, 
                      but standard inline/compact might be better. 
                      However, for simplicity in this stack, let's just toggle visibility or keep it clean.
                      The current implementation toggles showStartPicker.
                      For standard iOS spinner, it usually shows inline. 
                      Let's adjust: if iOS, maybe show it in a modal or just conditionally render below?
                      Actually, standard practice for iOS spinner in forms is often collapsible or a modal.
                      Let's stick to conditional rendering. 
                   */}
                  {Platform.OS === 'ios' && showStartPicker && (
                    <TouchableOpacity
                      style={styles.closePickerButton}
                      onPress={() => setShowStartPicker(false)}
                    >
                      <Text style={styles.closePickerText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.timeSeparator}>—</Text>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TouchableOpacity
                    style={styles.timeInputButton}
                    onPress={() => setShowEndPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeInputText}>{endTime}</Text>
                  </TouchableOpacity>
                  {(showEndPicker || (Platform.OS === 'ios' && showEndPicker)) && (
                    <DateTimePicker
                      value={timeStringToDate(endTime)}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                      textColor={colors.textDark}
                    />
                  )}
                  {Platform.OS === 'ios' && showEndPicker && (
                    <TouchableOpacity
                      style={styles.closePickerButton}
                      onPress={() => setShowEndPicker(false)}
                    >
                      <Text style={styles.closePickerText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={[styles.input, location ? styles.inputFilled : null]}
                placeholder="e.g., Building 4, Room 202"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.infoText}>
              You'll receive a notification 15 minutes before this lecture starts
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBackground,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.cardBackground, // Use card background as border
  },
  inputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    minWidth: 70,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayChipTextActive: {
    color: colors.background,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  timeInputButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    alignItems: 'center',
  },
  timeInputText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
  },
  timeInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    textAlign: 'center'
  },
  closePickerButton: {
    alignSelf: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
  },
  closePickerText: {
    color: colors.primary,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 18,
    color: colors.textMuted,
    marginTop: 24,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontWeight: '400',
  },
  infoText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 8,
  },
});

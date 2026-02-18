import React, { useState, useEffect, useMemo } from "react";
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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useLectures } from "@/contexts/LectureContext";
import { useSettings } from "@/contexts/SettingsContext";
import { DayOfWeek, CourseFile, Recurrence } from "@/types/lecture";
import { DAYS_OF_WEEK, formatTimeAMPM } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ColorTheme } from "@/types/theme";
import { validateLecture } from "@/utils/validation";
import ColorPicker from "@/components/ColorPicker";
import * as DocumentPicker from 'expo-document-picker';

export default function AddLectureScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { addLecture, updateLecture, getLectureById } = useLectures();
  const { colors, settings } = useSettings();

  const isEditing = Boolean(id);
  const existingLecture = isEditing ? getLectureById(id as string) : null;

  const [courseName, setCourseName] = useState(
    existingLecture?.courseName || ""
  );
  const [lecturer, setLecturer] = useState(
    existingLecture?.lecturer || ""
  );
  const [files, setFiles] = useState<CourseFile[]>(
    existingLecture?.files || []
  );

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(
    existingLecture?.dayOfWeek || "Monday"
  );

  // Recurrence State
  const [recurrenceType, setRecurrenceType] = useState<Recurrence['type']>(
    existingLecture?.recurrence?.type || 'weekly'
  );
  const [startDate, setStartDate] = useState<Date>(
    existingLecture?.recurrence?.startDate 
      ? new Date(existingLecture.recurrence.startDate) 
      : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    existingLecture?.recurrence?.endDate 
      ? new Date(existingLecture.recurrence.endDate) 
      : new Date(new Date().setMonth(new Date().getMonth() + 6)) // Default 6 months
  );

  // Keep strings as the source of truth for the logic
  const [startTime, setStartTime] = useState(
    existingLecture?.startTime || "09:00"
  );
  const [endTime, setEndTime] = useState(existingLecture?.endTime || "10:30");

  const [location, setLocation] = useState(existingLecture?.location || "");
  const [color, setColor] = useState(existingLecture?.color || "");
  const [isSaving, setIsSaving] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    return date;
  };

  // Helper to format Date object to "HH:MM" string
  const dateToTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setStartTime(dateToTimeString(selectedDate));
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setEndTime(dateToTimeString(selectedDate));
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*', // Allow all file types
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: CourseFile = {
          id: Date.now().toString(),
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType?.includes('image') ? 'image' : 
                asset.mimeType?.includes('pdf') ? 'pdf' : 'other',
          mimeType: asset.mimeType
        };
        setFiles(prev => [...prev, newFile]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const removeFile = (fileId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSave = async () => {
    // Comprehensive validation
    const validation = validateLecture(
      courseName,
      startTime,
      endTime,
      location
    );

    if (!validation.valid) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Validation Error", validation.errors.join("\n\n"));
      return;
    }

    setIsSaving(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const lectureData = {
        courseName: courseName.trim(),
        lecturer: lecturer.trim() || undefined,
        files: files.length > 0 ? files : undefined,
        dayOfWeek,
        startTime,
        endTime,
        location: location.trim() || undefined,
        color: color || undefined,
        recurrence: {
          type: recurrenceType,
          interval: recurrenceType === 'biweekly' ? 2 : 1,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      };

      if (isEditing && existingLecture) {
        await updateLecture(existingLecture.id, lectureData);
      } else {
        await addLecture(lectureData);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save lecture";
      Alert.alert("Error", errorMessage);
      setIsSaving(false);
    }
  };

  const handleDaySelect = (day: DayOfWeek) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDayOfWeek(day);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };


  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowStartDatePicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEndDatePicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  const RecurrenceSection = () => (
    <>
    <Text style={styles.sectionHeader}>RECURRENCE</Text>
    <View style={styles.groupedList}>
      {/* Frequency Selector */}
      <View style={styles.paddedRow}>
        <Text style={styles.rowLabel}>Repeat</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
           <TouchableOpacity 
              onPress={() => setRecurrenceType('weekly')}
              style={[styles.chip, recurrenceType === 'weekly' && styles.chipActive]}
           >
              <Text style={[styles.chipText, recurrenceType === 'weekly' && styles.chipTextActive]}>Weekly</Text>
           </TouchableOpacity>
           <TouchableOpacity 
              onPress={() => setRecurrenceType('biweekly')}
              style={[styles.chip, recurrenceType === 'biweekly' && styles.chipActive]}
           >
              <Text style={[styles.chipText, recurrenceType === 'biweekly' && styles.chipTextActive]}>Bi-Weekly</Text>
           </TouchableOpacity>
        </View>
      </View>

      <View style={styles.separator} />

      {/* Semester/Validity Dates */}
      <TouchableOpacity
        style={styles.pickerRow}
        onPress={() => setShowStartDatePicker(true)}
      >
        <Text style={styles.rowLabel}>First Class</Text>
        <Text style={styles.pickerValue}>{startDate.toLocaleDateString()}</Text>
      </TouchableOpacity>
      
      {(showStartDatePicker || (Platform.OS === 'ios' && showStartDatePicker)) && (
         <View style={styles.pickerContainer}>
            <DateTimePicker
               value={startDate}
               mode="date"
               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
               onChange={handleStartDateChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDone} onPress={() => setShowStartDatePicker(false)}>
                 <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
         </View>
      )}

      <View style={styles.separator} />

      <TouchableOpacity
        style={styles.pickerRow}
        onPress={() => setShowEndDatePicker(true)}
      >
        <Text style={styles.rowLabel}>Last Class</Text>
        <Text style={styles.pickerValue}>{endDate.toLocaleDateString()}</Text>
      </TouchableOpacity>
       {(showEndDatePicker || (Platform.OS === 'ios' && showEndDatePicker)) && (
         <View style={styles.pickerContainer}>
            <DateTimePicker
               value={endDate}
               mode="date"
               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
               onChange={handleEndDateChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDone} onPress={() => setShowEndDatePicker(false)}>
                 <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
         </View>
      )}
    </View>
    </>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={colors.cardBackground === "#F8F9FA" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Lecture" : "New Lecture"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[styles.animatedContainer, { opacity: fadeAnim }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionHeader}>COURSE DETAILS</Text>
            <View style={styles.groupedList}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Course Name"
                  placeholderTextColor={colors.textMuted}
                  value={courseName}
                  onChangeText={setCourseName}
                  autoCapitalize="words"
                  autoFocus
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={styles.separator} />
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Lecturer Name (Optional)"
                  placeholderTextColor={colors.textMuted}
                  value={lecturer}
                  onChangeText={setLecturer}
                  autoCapitalize="words"
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={styles.separator} />
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Location (Optional)"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                  autoCapitalize="words"
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            <Text style={styles.sectionHeader}>FILES & RESOURCES</Text>
            <View style={styles.groupedList}>
               {files.map((file, index) => (
                  <View key={file.id}>
                    <View style={styles.fileRow}>
                       <View style={styles.fileIconContainer}>
                          <Ionicons 
                            name={file.type === 'image' ? 'image-outline' : file.type === 'pdf' ? 'document-text-outline' : 'document-outline'} 
                            size={20} 
                            color={colors.primary} 
                          />
                       </View>
                       <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                       <TouchableOpacity onPress={() => removeFile(file.id)} style={styles.deleteFileBtn}>
                          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                       </TouchableOpacity>
                    </View>
                    {(index < files.length - 1) && <View style={styles.separator} />}
                  </View>
               ))}
               {(files.length > 0) && <View style={styles.separator} />}
               <TouchableOpacity style={styles.addFileRow} onPress={handlePickDocument}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                  <Text style={styles.addFileText}>Attach File</Text>
               </TouchableOpacity>
            </View>


            <Text style={styles.sectionHeader}>SCHEDULE</Text>
            <View style={styles.groupedList}>
              {/* Day Picker Row */}
              <View style={styles.paddedRow}>
                <Text style={styles.rowLabel}>Day</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayScrollContent}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayChip,
                        dayOfWeek === day && styles.dayChipActive,
                      ]}
                      onPress={() => handleDaySelect(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          dayOfWeek === day && styles.dayChipTextActive,
                        ]}
                      >
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.separator} />

              {/* Start Time */}
              {Platform.OS === 'web' ? (
                <View style={styles.pickerRow}>
                  <Text style={styles.rowLabel}>Starts</Text>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e: any) => {
                      setStartTime(e.target.value);
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync();
                      }
                    }}
                    style={{
                      fontSize: 17,
                      color: colors.primary,
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'Inter_400Regular',
                    }}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => setShowStartPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowLabel}>Starts</Text>
                    <View style={styles.pickerValueContainer}>
                      <Text style={styles.pickerValue}>
                        {formatTimeAMPM(startTime)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {(showStartPicker ||
                    (Platform.OS === "ios" && showStartPicker)) && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker
                          value={timeStringToDate(startTime)}
                          mode="time"
                          is24Hour={false}
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={handleStartTimeChange}
                          textColor={colors.textDark}
                          style={styles.datePicker}
                        />
                        {Platform.OS === "ios" && (
                          <TouchableOpacity
                            style={styles.pickerDone}
                            onPress={() => setShowStartPicker(false)}
                          >
                            <Text style={styles.pickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                </>
              )}

              <View style={styles.separator} />

              {/* End Time */}
              {Platform.OS === 'web' ? (
                <View style={styles.pickerRow}>
                  <Text style={styles.rowLabel}>Ends</Text>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e: any) => {
                      setEndTime(e.target.value);
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync();
                      }
                    }}
                    style={{
                      fontSize: 17,
                      color: colors.primary,
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'Inter_400Regular',
                    }}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => setShowEndPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowLabel}>Ends</Text>
                    <View style={styles.pickerValueContainer}>
                      <Text style={styles.pickerValue}>
                        {formatTimeAMPM(endTime)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {(showEndPicker || (Platform.OS === "ios" && showEndPicker)) && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={timeStringToDate(endTime)}
                        mode="time"
                        is24Hour={false}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleEndTimeChange}
                        textColor={colors.textDark}
                        style={styles.datePicker}
                      />
                      {Platform.OS === "ios" && (
                        <TouchableOpacity
                          style={styles.pickerDone}
                          onPress={() => setShowEndPicker(false)}
                        >
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            <RecurrenceSection />

            <ColorPicker selectedColor={color} onColorSelect={setColor} />

            <Text style={styles.infoText}>
              Notifications will be sent {settings.notificationOffset} minutes
              before class.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.cardBackground === "#F8F9FA" ? "#F2F2F7" : "#000000",
    },
    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground, // Modal header style
      borderBottomWidth: 1,
      borderBottomColor: colors.textMuted + "20",
    },
    backButton: {
      padding: 8,
    },
    cancelText: {
      fontSize: 17,
      color: colors.primary,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.textDark,
    },
    saveButton: {
      padding: 8,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.primary,
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
    sectionHeader: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 8,
      marginLeft: 16,
      marginTop: 24,
      letterSpacing: -0.2,
    },
    groupedList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: "hidden",
    },
    inputRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
    },
    textInput: {
      fontSize: 17,
      color: colors.textDark,
      paddingVertical: 4,
    },
    separator: {
      height: 1,
      backgroundColor: colors.textMuted + "20",
      marginLeft: 16,
    },
    paddedRow: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
    },
    rowLabel: {
      fontSize: 17,
      color: colors.textDark,
    },
    dayScrollContent: {
      gap: 8,
      paddingRight: 16,
    },
    dayChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textMuted + "30",
    },
    dayChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textDark,
    },
    dayChipTextActive: {
      color: "#FFF",
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textMuted + '30',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textDark,
    },
    chipTextActive: {
      color: '#FFF',
    },
    pickerValueContainer: {
      backgroundColor: colors.textMuted + "20",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    pickerValue: {
      fontSize: 17,
      color: colors.textDark,
      fontWeight: "500",
    },
    pickerContainer: {
      backgroundColor: colors.cardBackground,
      paddingBottom: 16,
    },
    datePicker: {
      alignSelf: "center",
    },
    pickerDone: {
      alignItems: "center",
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.textMuted + "20",
    },
    pickerDoneText: {
      fontSize: 17,
      color: colors.primary,
      fontWeight: "600",
    },
    infoText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 24,
    },
    // Files Styles
    addFileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    addFileText: {
       fontSize: 16,
       fontWeight: '500',
       color: colors.primary,
    },
    fileRow: {
       flexDirection: 'row',
       alignItems: 'center',
       paddingVertical: 12,
       paddingHorizontal: 16,
    },
    fileIconContainer: {
       marginRight: 12,
    },
    fileName: {
       flex: 1,
       fontSize: 16,
       color: colors.textDark,
    },
    deleteFileBtn: {
       padding: 4,
    }
  });


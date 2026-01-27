import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ColorTheme } from '@/types/theme';

export default function AddExamScreen() {
    const router = useRouter();
    const { colors } = useSettings();
    const { addExam } = useExams();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [courseName, setCourseName] = useState('');
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Status Bar Logic
    const statusBarStyle = colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content';

    const handleSave = async () => {
        if (!courseName.trim()) {
            alert('Please enter a course name');
            return;
        }

        setIsSaving(true);
        await addExam({
            courseName,
            date: date.toISOString(),
            location,
            notes
        });
        setIsSaving(false);
        router.back();
    };

    const showAndroidDatePicker = () => {
        DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            onChange: (_, selectedDate) => {
                if (selectedDate) {
                    const newDate = new Date(selectedDate);
                    // Preserve time
                    newDate.setHours(date.getHours());
                    newDate.setMinutes(date.getMinutes());

                    // Show Time Picker immediately after
                    DateTimePickerAndroid.open({
                        value: newDate,
                        mode: 'time',
                        is24Hour: false,
                        onChange: (_, selectedTime) => {
                            if (selectedTime) {
                                const finalDate = new Date(newDate);
                                finalDate.setHours(selectedTime.getHours());
                                finalDate.setMinutes(selectedTime.getMinutes());
                                setDate(finalDate);
                            }
                        }
                    });
                }
            }
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar
                barStyle={statusBarStyle}
                backgroundColor="transparent"
                translucent
            />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Exam</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>COURSE NAME</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Calculus II Midterm"
                        placeholderTextColor={colors.textMuted}
                        value={courseName}
                        onChangeText={setCourseName}
                        autoFocus
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>DATE & TIME</Text>

                    {Platform.OS === 'web' ? (
                        <View style={styles.datePickerCard}>
                            <input
                                type="datetime-local"
                                value={date.toISOString().slice(0, 16)}
                                onChange={(e: any) => {
                                    const newDate = new Date(e.target.value);
                                    if (!isNaN(newDate.getTime())) {
                                        setDate(newDate);
                                    }
                                }}
                                style={{
                                    fontSize: 16,
                                    padding: 8,
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: colors.textDark,
                                    width: '100%',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    cursor: 'pointer',
                                }}
                            />
                        </View>
                    ) : Platform.OS === 'ios' ? (
                        <View style={styles.datePickerCard}>
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="spinner"
                                onChange={(_, selectedDate) => selectedDate && setDate(selectedDate)}
                                style={{ height: 120 }}
                                textColor={colors.textDark}
                            />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.androidDateButton}
                            onPress={showAndroidDatePicker}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                            <Text style={styles.androidDateText}>
                                {date.toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                })}
                            </Text>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>LOCATION (OPTIONAL)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Hall B"
                        placeholderTextColor={colors.textMuted}
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>NOTES (OPTIONAL)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Topics to study..."
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBackground,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textDark,
    },
    cancelButton: {
        padding: 8,
    },
    cancelText: {
        fontSize: 17,
        color: colors.primary,
    },
    saveButton: {
        padding: 8,
    },
    saveText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.primary,
    },
    content: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        color: colors.textDark,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    datePickerCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    androidDateButton: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    androidDateText: {
        fontSize: 16,
        color: colors.textDark,
        marginLeft: 12,
    },
});

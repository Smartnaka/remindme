import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal, Switch, Linking } from 'react-native';
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

export default function SettingsScreen() {
    const { settings, updateSettings, colors } = useSettings();
    const { lectures, clearLectures, clearAssignments } = useLectures();
    const { clearExams } = useExams();
    const { showAlert } = useCustomAlert();
    const { bottom: bottomInset } = useSafeAreaInsets();
    
    const [manageDataModalVisible, setManageDataModalVisible] = useState(false);
    const [showSummaryPicker, setShowSummaryPicker] = useState(false);
    const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
    const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
    const [showSemesterStartPicker, setShowSemesterStartPicker] = useState(false);
    const [showSemesterEndPicker, setShowSemesterEndPicker] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'lecture' | 'assignment' | 'exam' | null>(null);

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

    const getQuietDate = (timeStr: string) => {
        const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
        const d = new Date();
        d.setHours(hours || 0, minutes || 0, 0, 0);
        return d;
    };

    const getSemesterDate = (dateStr?: string) => dateStr ? new Date(dateStr) : new Date();

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Not set';
        return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleQuietStartChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowQuietStartPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSettings({ quietHoursStart: `${hours}:${minutes}` });
        }
    };

    const handleQuietEndChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowQuietEndPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            updateSettings({ quietHoursEnd: `${hours}:${minutes}` });
        }
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
                keys.map(k => AsyncStorage.getItem(k))
            );
            const exportPayload = {
                settings: settingsData ? JSON.parse(settingsData) : {},
                lectures: lecturesData ? JSON.parse(lecturesData) : [],
                assignments: assignmentsData ? JSON.parse(assignmentsData) : [],
                exams: examsData ? JSON.parse(examsData) : [],
                exportedAt: new Date().toISOString()
            };
            const docDir = (FileSystem as any).documentDirectory || '';
            const fileUri = `${docDir}RemindMe_Export.json`;
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportPayload, null, 2));
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                showAlert("Error", "Sharing is not available on this device", [{text: 'OK'}]);
            }
        } catch (e) {
            console.error("Failed to export data", e);
            showAlert("Export Failed", "Could not export app data.", [{text: 'OK'}]);
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

    // Simple row component
    const SettingRow = ({ label, value, onPress, rightElement }: { label: string; value?: string; onPress?: () => void; rightElement?: React.ReactNode }) => (
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
            <Text style={styles.rowLabel}>{label}</Text>
            {rightElement || (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
        </TouchableOpacity>
    );

    const SwitchRow = ({ label, subtitle, value, onValueChange }: { label: string; subtitle?: string; value?: boolean; onValueChange: (v: boolean) => void }) => (
        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {subtitle && <Text style={styles.rowSubtext}>{subtitle}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.textMuted + '40', true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>

                {/* APPEARANCE */}
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Theme</Text>
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
                        label="Reduce Motion"
                        value={settings.reduceMotion}
                        onValueChange={(val) => updateSettings({ reduceMotion: val })}
                    />
                </View>

                {/* SEMESTER */}
                <Text style={styles.sectionTitle}>Semester</Text>
                <View style={styles.card}>
                    <SettingRow label="Start Date" value={formatDate(settings.semesterStart)} onPress={() => setShowSemesterStartPicker(true)} />
                    {showSemesterStartPicker && (
                        <DateTimePicker value={getSemesterDate(settings.semesterStart)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleSemesterStartChange} />
                    )}

                    <View style={styles.divider} />

                    <SettingRow label="End Date" value={formatDate(settings.semesterEnd)} onPress={() => setShowSemesterEndPicker(true)} />
                    {showSemesterEndPicker && (
                        <DateTimePicker value={getSemesterDate(settings.semesterEnd)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleSemesterEndChange} />
                    )}
                </View>
                <Text style={styles.sectionHint}>Notifications only fire within these dates</Text>

                {/* REMINDERS */}
                <Text style={styles.sectionTitle}>Reminders</Text>
                <View style={styles.card}>
                    <SettingRow label="Lecture" value={formatDuration(settings.lectureOffset) + ' before'} onPress={() => handleOpenPicker('lecture')} />
                    <View style={styles.divider} />
                    <SettingRow label="Assignment" value={formatDuration(settings.assignmentOffset) + ' before'} onPress={() => handleOpenPicker('assignment')} />
                    <View style={styles.divider} />
                    <SettingRow label="Exam" value={formatDuration(settings.examOffset) + ' before'} onPress={() => handleOpenPicker('exam')} />

                    <View style={styles.divider} />

                    <SwitchRow
                        label="Notify at Class Start"
                        subtitle="Alert when class begins"
                        value={settings.notifyAtClassStart}
                        onValueChange={(val) => updateSettings({ notifyAtClassStart: val })}
                    />

                    <View style={styles.divider} />

                    <SwitchRow
                        label="Daily Summary"
                        subtitle="Morning overview of your day"
                        value={settings.dailySummaryEnabled}
                        onValueChange={(val) => updateSettings({ dailySummaryEnabled: val })}
                    />

                    {settings.dailySummaryEnabled && (
                        <>
                            <View style={styles.divider} />
                            <SettingRow label="Summary Time" value={formatTime(settings.dailySummaryTime || '07:00')} onPress={() => setShowSummaryPicker(true)} />
                            {showSummaryPicker && (
                                <DateTimePicker value={getSummaryDate()} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleSummaryTimeChange} />
                            )}
                        </>
                    )}

                    <View style={styles.divider} />

                    <SwitchRow
                        label="Quiet Hours"
                        subtitle="Block notifications during sleep"
                        value={settings.quietHoursEnabled}
                        onValueChange={(val) => updateSettings({ quietHoursEnabled: val })}
                    />

                    {settings.quietHoursEnabled && (
                        <>
                            <View style={styles.divider} />
                            <SettingRow label="Start" value={formatTime(settings.quietHoursStart || '22:00')} onPress={() => setShowQuietStartPicker(true)} />
                            {showQuietStartPicker && (
                                <DateTimePicker value={getQuietDate(settings.quietHoursStart || '22:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleQuietStartChange} />
                            )}
                            <View style={styles.divider} />
                            <SettingRow label="End" value={formatTime(settings.quietHoursEnd || '07:00')} onPress={() => setShowQuietEndPicker(true)} />
                            {showQuietEndPicker && (
                                <DateTimePicker value={getQuietDate(settings.quietHoursEnd || '07:00')} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleQuietEndChange} />
                            )}
                        </>
                    )}
                </View>

                {/* DATA */}
                <Text style={styles.sectionTitle}>Data</Text>
                <View style={styles.card}>
                    <SettingRow label="Export Data" onPress={handleExportData} rightElement={<Ionicons name="download-outline" size={20} color={colors.textMuted} />} />
                    <View style={styles.divider} />
                    <SettingRow label="Manage Data" onPress={() => setManageDataModalVisible(true)} rightElement={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />} />
                </View>

                {/* SUPPORT */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.card}>
                    <SettingRow label="Feedback & Bug Report" onPress={() => Linking.openURL('mailto:support@remindme.app')} rightElement={<Ionicons name="open-outline" size={18} color={colors.textMuted} />} />
                </View>

                <Text style={styles.versionText}>RemindMe v{Constants.expoConfig?.version || '1.0.0'}</Text>

            </ScrollView>

            {/* REMINDER OFFSET PICKER MODAL */}
            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {pickerType === 'lecture' ? 'Lecture Reminder' : pickerType === 'assignment' ? 'Assignment Reminder' : 'Exam Reminder'}
                        </Text>
                        
                        {(pickerType === 'exam' ? EXAM_NOTIFICATION_OPTIONS : NOTIFICATION_OPTIONS).map((minutes) => {
                            const isSelected = 
                                (pickerType === 'lecture' && settings.lectureOffset === minutes) ||
                                (pickerType === 'assignment' && settings.assignmentOffset === minutes) ||
                                (pickerType === 'exam' && settings.examOffset === minutes);
                            return (
                                <TouchableOpacity key={minutes} style={styles.modalOption} onPress={() => handleSelectOption(minutes)}>
                                    <Text style={[styles.modalOptionText, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                                        {formatDuration(minutes)} before
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
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
            <Modal visible={manageDataModalVisible} transparent animationType="fade" onRequestClose={() => setManageDataModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setManageDataModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Manage Data</Text>

                        <TouchableOpacity style={styles.modalOption} onPress={() => {
                            setManageDataModalVisible(false);
                            setTimeout(() => {
                                showAlert("End Semester?", "This will remove all classes and reminders. Cannot be undone.", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "End Semester", style: "destructive", onPress: clearLectures }
                                ]);
                            }, 300);
                        }}>
                            <Text style={[styles.modalOptionText, { color: colors.error }]}>Clear All Classes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => {
                            setManageDataModalVisible(false);
                            setTimeout(() => {
                                showAlert("Delete All Assignments?", "This will remove all your tasks. Cannot be undone.", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: async () => await clearAssignments?.() }
                                ]);
                            }, 300);
                        }}>
                            <Text style={[styles.modalOptionText, { color: colors.error }]}>Clear All Assignments</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={() => {
                            setManageDataModalVisible(false);
                            setTimeout(() => {
                                showAlert("Delete All Exams?", "This will remove all exam schedules. Cannot be undone.", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: clearExams }
                                ]);
                            }, 300);
                        }}>
                            <Text style={[styles.modalOptionText, { color: colors.error }]}>Clear All Exams</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCancel} onPress={() => setManageDataModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: ColorTheme, bottomInset: number = 0) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Inter_700Bold',
        color: colors.textDark,
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textMuted,
        marginTop: 24,
        marginBottom: 8,
        paddingLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionHint: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: colors.textMuted,
        paddingLeft: 4,
        marginTop: 6,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 48,
    },
    rowLabel: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: colors.textDark,
    },
    rowValue: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: colors.textMuted,
    },
    rowSubtext: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: colors.textMuted,
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.textMuted + '25',
        marginLeft: 16,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 3,
    },
    segmentButton: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    segmentButtonActive: {
        backgroundColor: colors.cardBackground,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
            android: { elevation: 2 },
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
        marginTop: 32,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: Math.max(bottomInset, Platform.OS === 'ios' ? 40 : 24),
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textDark,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.textMuted + '20',
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: colors.textDark,
    },
    modalCancel: {
        marginTop: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textDark,
    },
});

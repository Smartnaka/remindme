import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';
import { Lecture } from '@/types/lecture';
import * as Haptics from 'expo-haptics';

interface LectureContextMenuProps {
    visible: boolean;
    lecture: Lecture | null;
    onClose: () => void;
    onEdit: (lecture: Lecture) => void;
    onView: (lecture: Lecture) => void;
    onDelete: (lecture: Lecture) => void;
}

export default function LectureContextMenu({
    visible,
    lecture,
    onClose,
    onEdit,
    onView,
    onDelete
}: LectureContextMenuProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (!visible || !lecture) return null;

    const handleAction = (action: (lecture: Lecture) => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
        // Slight delay to allow modal to close before navigating/showing alerts
        setTimeout(() => {
            action(lecture);
        }, 150);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.sheetContainer}>
                            <View style={styles.dragHandle} />
                            
                            <View style={styles.header}>
                                <View style={[styles.colorDot, { backgroundColor: lecture.color || colors.primary }]} />
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {lecture.courseName}
                                </Text>
                            </View>

                            <View style={styles.actionsGroup}>
                                <TouchableOpacity 
                                    style={styles.actionRow}
                                    onPress={() => handleAction(onView)}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="eye-outline" size={24} color={colors.textDark} />
                                    </View>
                                    <Text style={styles.actionText}>View Details</Text>
                                </TouchableOpacity>

                                <View style={styles.divider} />

                                <TouchableOpacity 
                                    style={styles.actionRow}
                                    onPress={() => handleAction(onEdit)}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="pencil-outline" size={24} color={colors.textDark} />
                                    </View>
                                    <Text style={styles.actionText}>Edit Lecture</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.actionsGroup, { marginTop: 16 }]}>
                                <TouchableOpacity 
                                    style={styles.actionRow}
                                    onPress={() => handleAction(onDelete)}
                                >
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                    </View>
                                    <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete Lecture</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                                style={styles.cancelButton}
                                onPress={onClose}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
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
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: colors.textMuted + '40',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textDark,
        flex: 1,
    },
    actionsGroup: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 32,
    },
    actionText: {
        fontSize: 17,
        fontFamily: 'Inter_500Medium',
        color: colors.textDark,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.textMuted + '30',
        marginLeft: 52, // Align with text
    },
    cancelButton: {
        marginTop: 16,
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 17,
        fontFamily: 'Inter_600SemiBold',
        color: colors.textDark,
    }
});

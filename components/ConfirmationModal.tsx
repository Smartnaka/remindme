import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    cancelText?: string;
    confirmText?: string;
    onCancel: () => void;
    onConfirm: () => void;
    isDestructive?: boolean; // If true, confirm button is red
}

export default function ConfirmationModal({
    visible,
    title,
    message,
    cancelText = "Cancel",
    confirmText = "Confirm",
    onCancel,
    onConfirm,
    isDestructive = false,
}: ConfirmationModalProps) {
    const { colors } = useSettings();
    const styles = createStyles(colors);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>

                        <View style={styles.separator} />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={onConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.confirmText, isDestructive && styles.destructiveText]}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        width: 270,
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        alignItems: 'center',
        paddingTop: 20,
        // Shadow for elevation
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textDark,
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        fontSize: 13,
        color: colors.textDark,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        borderTopWidth: 0.5,
        borderTopColor: colors.textMuted + '40',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    separator: {
        width: 0.5,
        backgroundColor: colors.textMuted + '40',
    },
    cancelText: {
        fontSize: 17,
        fontWeight: '400',
        color: colors.primary, // iOS default blue-ish
    },
    confirmText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.primary,
    },
    destructiveText: {
        color: colors.error,
    }
});

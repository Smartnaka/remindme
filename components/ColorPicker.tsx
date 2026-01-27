import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LECTURE_COLORS } from '@/constants/colors';

interface ColorPickerProps {
    selectedColor?: string;
    onColorSelect: (color: string) => void;
}

export default function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
    const handleColorPress = (color: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onColorSelect(color);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>COLOR</Text>
            <View style={styles.colorGrid}>
                {LECTURE_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color.value}
                        style={[
                            styles.colorButton,
                            { backgroundColor: color.value },
                            selectedColor === color.value && styles.selectedButton,
                        ]}
                        onPress={() => handleColorPress(color.value)}
                        activeOpacity={0.7}
                    >
                        {selectedColor === color.value && (
                            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: '#8B8B8B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedButton: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});

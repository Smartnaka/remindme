import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';

interface CheckboxProps {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = ({ checked, onCheckedChange }: CheckboxProps) => {
    const { colors } = useSettings();

    return (
        <TouchableOpacity
            onPress={() => onCheckedChange?.(!checked)}
            style={[
                styles.container,
                checked
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { borderColor: colors.textMuted + '80', backgroundColor: 'transparent' }
            ]}
            activeOpacity={0.7}
        >
            {checked && (
                <Ionicons name="checkmark" size={14} color={colors.background === '#000000' ? '#000' : '#fff'} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';

interface SwitchProps {
    value: boolean;
    onValueChange?: (value: boolean) => void;
}

export const Switch = ({ value, onValueChange }: SwitchProps) => {
    const { colors } = useSettings();
    const translateX = useRef(new Animated.Value(value ? 20 : 2)).current;

    useEffect(() => {
        Animated.timing(translateX, {
            toValue: value ? 20 : 2,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [value]);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onValueChange?.(!value)}
            style={[
                styles.container,
                {
                    backgroundColor: value ? colors.primary : '#333333', // Dark gray when off, Primary when on
                    borderColor: value ? colors.primary : '#333333',
                },
            ]}
        >
            <Animated.View
                style={[
                    styles.thumb,
                    {
                        transform: [{ translateX }],
                        backgroundColor: value && colors.background === '#000000' ? '#000' : '#FFF', // Contrast thumb
                    },
                ]}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 44,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        borderWidth: 1,
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        left: 0,
    },
});

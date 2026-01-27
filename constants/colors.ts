import { ColorTheme } from '@/types/theme';

const primary = "#00C896";
const primaryLight = "#E8F8F4";
const textDark = "#1A1A1A";
const textMuted = "#8B8B8B";
const cardBackground = "#F8F9FA";

export const LightColors: ColorTheme = {
  primary: "#00C896",
  primaryLight: "#E8F8F4",
  textDark: "#1A1A1A",
  textMuted: "#8B8B8B",
  cardBackground: "#F8F9FA",
  background: "#FFFFFF",
  success: "#00C896",
  error: "#FF6B6B",
  warning: "#FFB946",
  tint: "#00C896",
};

export const DarkColors: ColorTheme = {
  primary: "#34C759", // iOS Green (Premium)
  primaryLight: "#1C2C22", // Subtle green tint
  textDark: "#FFFFFF",
  textMuted: "#8E8E93", // iOS System Gray
  cardBackground: "#1C1C1E", // System Gray 6
  background: "#000000", // Pure Black
  success: "#30D158",
  error: "#FF453A", // iOS Red
  warning: "#FF9F0A",
  tint: "#34C759",
};

export default LightColors; // Default backward compatibility if needed, but we should migrate

// Predefined color palette for lectures
export const LECTURE_COLORS = [
  { name: 'Red', value: '#FF5757' },
  { name: 'Orange', value: '#FF9F43' },
  { name: 'Yellow', value: '#FFC837' },
  { name: 'Green', value: '#5FD068' },
  { name: 'Teal', value: '#1DD1A1' },
  { name: 'Blue', value: '#54A0FF' },
  { name: 'Purple', value: '#A55EEA' },
  { name: 'Pink', value: '#FF6B9D' },
  { name: 'Brown', value: '#A0826D' },
  { name: 'Gray', value: '#8395A7' },
  { name: 'Navy', value: '#576574' },
  { name: 'Mint', value: '#48DBFB' },
];

export const DEFAULT_LECTURE_COLOR = '#8395A7'; // Gray

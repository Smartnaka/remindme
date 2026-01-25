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


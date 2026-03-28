const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const sentryMetroPath = path.join(
  __dirname,
  "node_modules",
  "@sentry",
  "react-native",
  "metro.js"
);

if (fs.existsSync(sentryMetroPath)) {
  const { getSentryExpoConfig } = require("@sentry/react-native/metro");
  module.exports = getSentryExpoConfig(__dirname);
} else {
  module.exports = getDefaultConfig(__dirname);
}

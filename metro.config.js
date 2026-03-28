const { getDefaultConfig } = require("expo/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");

const sentryMetroPath = path.join(
  __dirname,
  "node_modules",
  "@sentry",
  "react-native",
  "metro.js"
);

module.exports = withSentryConfig(config);

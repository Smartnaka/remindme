const fs = require("fs");
const path = require("path");

module.exports = function (api) {
  api.cache(true);

  const sentryBabelPluginPath = path.join(
    __dirname,
    "node_modules",
    "@sentry",
    "react-native",
    "babel.js"
  );

  const plugins = [];

  if (fs.existsSync(sentryBabelPluginPath)) {
    plugins.push("@sentry/react-native/babel");
  }

  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins,
  };
};

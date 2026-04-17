const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable tree-shaking / dead-code elimination for production builds.
// Metro resolves ES-module `import` semantics through its own bundler; the
// flags below tell it to prefer the `module` (ESM) entry point of packages
// (better DCE) and to inline `process.env.NODE_ENV` so dead branches can be
// removed by the minifier.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "require",
  "import",
  "react-native",
  "browser",
  "default",
];

// Inline environment constants so the minifier can remove dead code like
// `if (__DEV__) { ... }` in production bundles.
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...((config.transformer || {}).minifierConfig || {}),
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      toplevel: false,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    compress: {
      ...((((config.transformer || {}).minifierConfig || {}).compress) || {}),
      reduce_funcs: false,
    },
  },
};

module.exports = config;

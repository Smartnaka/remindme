import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const sentryConfig = (Constants.expoConfig?.extra?.sentry ?? {}) as {
  dsn?: string;
  environment?: string;
};

let initialized = false;

export function initSentry() {
  if (initialized) {
    return;
  }

  const dsn = sentryConfig.dsn;

  if (!dsn) {
    console.warn('[Sentry] DSN is missing. Sentry initialization skipped.');
    return;
  }

  Sentry.init({
    dsn,
    environment: sentryConfig.environment ?? (__DEV__ ? 'development' : 'production'),
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
  });

  initialized = true;
}

export { Sentry };

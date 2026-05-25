const rawEnv = import.meta.env;

function readString(key, fallback = '') {
  return String(rawEnv[key] ?? fallback).trim();
}

function readBoolean(key, fallback = false) {
  const value = readString(key);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readNumber(key, fallback) {
  const value = Number(readString(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const firebaseConfig = {
  apiKey: readString('VITE_FIREBASE_API_KEY'),
  authDomain: readString('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readString('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readString('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readString('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readString('VITE_FIREBASE_APP_ID'),
  measurementId: readString('VITE_FIREBASE_MEASUREMENT_ID'),
};

const requiredFirebaseKeys = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
];

const missingFirebaseKeys = requiredFirebaseKeys.filter(([, value]) => !value).map(([key]) => key);
const useLocalFallback = readBoolean('VITE_FIREBASE_USE_LOCAL_FALLBACK', false);

export const appEnv = {
  appName: readString('VITE_APP_NAME', 'Dexa'),
  appEnvironment: readString('VITE_APP_ENV', rawEnv.MODE || 'development'),
  companyName: readString('VITE_COMPANY_NAME', 'Dexa'),
  supportEmail: readString('VITE_SUPPORT_EMAIL'),
  enablePwa: readBoolean('VITE_ENABLE_PWA', true),
  enableNotifications: readBoolean('VITE_ENABLE_NOTIFICATIONS', true),
  enableGps: readBoolean('VITE_ENABLE_GPS', true),
  shiftRadiusMeters: readNumber('VITE_SHIFT_RADIUS_METERS', readNumber('VITE_DEFAULT_RESTAURANT_RADIUS_METERS', 100)),
  locationAccuracyLimit: readNumber('VITE_LOCATION_ACCURACY_LIMIT', readNumber('VITE_MAX_LOCATION_ACCURACY_METERS', 50)),
  hourlyRate: readNumber('VITE_HOURLY_RATE', 225),
  firebaseConfig,
  firebaseReady: missingFirebaseKeys.length === 0,
  firebaseUseLocalFallback: useLocalFallback,
  missingFirebaseKeys,
};

export const envValidation = {
  firebaseReady: appEnv.firebaseReady,
  firebaseEnabled: appEnv.firebaseReady && !appEnv.firebaseUseLocalFallback,
  missingFirebaseKeys,
  hasBlockingProductionIssue:
    appEnv.appEnvironment === 'production' && !appEnv.firebaseReady && !appEnv.firebaseUseLocalFallback,
  message: appEnv.firebaseReady
    ? ''
    : `Firebase yapılandırması eksik: ${missingFirebaseKeys.join(', ')}`,
};

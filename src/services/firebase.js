import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { appEnv, envValidation } from '../config/env';

export const firebaseConfig = appEnv.firebaseConfig;
export const firebaseEnabled = envValidation.firebaseEnabled;

let app = null;
let firebaseInitError = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    firebaseInitError = error;
    app = null;
  }
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export { serverTimestamp, firebaseInitError };

export function requireFirebase() {
  if (!firebaseEnabled || !auth || !db || firebaseInitError) {
    throw new Error(
      firebaseInitError?.message ||
        'Firebase yapılandırması hazır değil. Vercel Environment Variables veya .env değerlerini kontrol edin.',
    );
  }
}

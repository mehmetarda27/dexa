import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { envValidation } from '../config/env';
import { getCourierByUid } from './courierService';
import { auth, firebaseEnabled } from './firebase';
import { collections, getDocument, setDocument } from './firestoreService';
import { findLocalUser } from './localUserStore';

const SESSION_KEY = 'dexa.session';
const AUTH_EMAIL_DOMAIN = 'dexa.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@dexa.com';
const BOOTSTRAP_ADMIN_PASSWORD = 'delivera3333';

function persistSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function resolveLoginEmail(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (!normalizedValue) return '';
  if (normalizedValue.includes('@')) return normalizedValue;
  if (normalizedValue === ADMIN_USERNAME) return ADMIN_EMAIL;
  return `${normalizedValue}@${AUTH_EMAIL_DOMAIN}`;
}

function getFriendlyAuthError(error, emailForAuth) {
  const code = error?.code || '';

  if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(code)) {
    return `Kullanıcı adı/e-posta veya şifre hatalı. Firebase Auth hesabı ${emailForAuth} olarak tanımlı olmalı.`;
  }

  if (code === 'auth/invalid-email') {
    return 'Geçerli bir kullanıcı adı veya e-posta girin.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Çok fazla hatalı giriş denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Firebase bağlantısı kurulamadı. İnternet bağlantısını kontrol edin.';
  }

  return error?.message || 'Giriş yapılamadı. Lütfen bilgileri kontrol edin.';
}

function isInvalidCredential(error) {
  return ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(error?.code);
}

function isBootstrapAdminLogin(emailForAuth, passwordValue) {
  return emailForAuth === ADMIN_EMAIL && passwordValue === BOOTSTRAP_ADMIN_PASSWORD;
}

async function ensureBootstrapAdminProfile(uid) {
  const profile = {
    uid,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    role: 'super_admin',
    active: true,
    createdAt: new Date().toISOString(),
  };
  await setDocument(collections.users, uid, profile);
  return profile;
}

async function createBootstrapAdmin(emailForAuth, passwordValue) {
  const credential = await createUserWithEmailAndPassword(auth, emailForAuth, passwordValue);
  const userProfile = await ensureBootstrapAdminProfile(credential.user.uid);
  return { credential, userProfile };
}

function loginLocally(usernameOrEmail, password) {
  const localUsername = import.meta.env.VITE_LOCAL_ADMIN_USERNAME || ADMIN_USERNAME;
  const localPassword = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD || 'delivera3333';
  const localRole = import.meta.env.VITE_LOCAL_ADMIN_ROLE || 'super_admin';
  const localName = import.meta.env.VITE_LOCAL_ADMIN_NAME || 'Dexa Admin';
  const normalizedValue = String(usernameOrEmail || '').trim().toLowerCase();
  const localEmail = resolveLoginEmail(localUsername);

  if (
    localUsername &&
    localPassword &&
    (normalizedValue === localUsername || normalizedValue === localEmail) &&
    password === localPassword
  ) {
    return persistSession({
      role: localRole,
      username: localUsername,
      name: localName,
      uid: 'local-bootstrap-admin',
      email: localEmail,
    });
  }

  const localUser = findLocalUser(normalizedValue, password);
  if (localUser) {
    if (!localUser.active) throw new Error('Hesap aktif değil.');
    return persistSession({
      role: localUser.role,
      username: localUser.username,
      name: localUser.name,
      uid: localUser.uid,
      email: localUser.email,
      courierId: localUser.courierId || null,
    });
  }

  throw new Error('Kullanıcı adı/e-posta veya şifre hatalı.');
}

export async function login(usernameOrEmail, password) {
  const loginValue = String(usernameOrEmail || '').trim().toLowerCase();
  const passwordValue = String(password || '');
  const emailForAuth = resolveLoginEmail(loginValue);

  if (!loginValue || !passwordValue) {
    throw new Error('Kullanıcı adı ve şifre zorunludur.');
  }

  if (!firebaseEnabled) {
    if (envValidation.hasBlockingProductionIssue) {
      throw new Error('Firebase ayarları eksik. Vercel Environment Variables alanlarına Firebase config değerlerini ekleyin.');
    }
    return loginLocally(loginValue, passwordValue);
  }

  let credential;
  let bootstrappedProfile = null;
  try {
    credential = await signInWithEmailAndPassword(auth, emailForAuth, passwordValue);
  } catch (error) {
    if (isInvalidCredential(error) && isBootstrapAdminLogin(emailForAuth, passwordValue)) {
      try {
        const bootstrapped = await createBootstrapAdmin(emailForAuth, passwordValue);
        credential = bootstrapped.credential;
        bootstrappedProfile = bootstrapped.userProfile;
      } catch (bootstrapError) {
        throw new Error(getFriendlyAuthError(bootstrapError, emailForAuth));
      }
    } else {
    throw new Error(getFriendlyAuthError(error, emailForAuth));
    }
  }

  const userProfile = bootstrappedProfile || await getDocument(collections.users, credential.user.uid);

  if (!userProfile) {
    if (credential.user.email === ADMIN_EMAIL && passwordValue === BOOTSTRAP_ADMIN_PASSWORD) {
      const profile = await ensureBootstrapAdminProfile(credential.user.uid);
      return persistSession({
        uid: credential.user.uid,
        role: profile.role,
        username: profile.username,
        email: profile.email,
        courierId: null,
        name: 'Dexa Admin',
      });
    }
    await signOut(auth);
    throw new Error('Giriş başarılı ancak Firestore kullanıcı profili bulunamadı. users koleksiyonunda Auth UID ile kayıt oluşturun.');
  }

  if (!userProfile.active) {
    await signOut(auth);
    throw new Error('Hesap aktif değil.');
  }

  const courierProfile = userProfile.role === 'courier' ? await getCourierByUid(credential.user.uid) : null;

  return persistSession({
    uid: credential.user.uid,
    role: userProfile.role,
    username: userProfile.username || loginValue,
    email: userProfile.email || emailForAuth,
    courierId: courierProfile?.id || null,
    name: courierProfile?.fullName || userProfile.name || userProfile.username || loginValue,
  });
}

export async function resetPassword(emailOrUsername) {
  const value = String(emailOrUsername || '').trim().toLowerCase();
  if (!value) throw new Error('Şifre sıfırlama için e-posta veya kullanıcı adı girin.');
  if (!firebaseEnabled) {
    throw new Error('Şifre sıfırlama için Firebase Auth yapılandırması gerekir.');
  }
  await sendPasswordResetEmail(auth, resolveLoginEmail(value));
  return true;
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  if (!firebaseEnabled) return getSession();

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        resolve(null);
        return;
      }

      const userProfile = await getDocument(collections.users, user.uid);
      if (!userProfile?.active) {
        localStorage.removeItem(SESSION_KEY);
        resolve(null);
        return;
      }

      const courierProfile = userProfile.role === 'courier' ? await getCourierByUid(user.uid) : null;
      resolve(
        persistSession({
          uid: user.uid,
          role: userProfile.role,
          username: userProfile.username,
          email: userProfile.email,
          courierId: courierProfile?.id || null,
          name: courierProfile?.fullName || userProfile.username,
        }),
      );
    });
  });
}

export async function logout() {
  if (firebaseEnabled && auth) {
    await signOut(auth);
  }
  localStorage.removeItem(SESSION_KEY);
}

export function canAccessRole(session, role) {
  return Boolean(session?.role === role);
}

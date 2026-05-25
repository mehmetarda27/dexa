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

function getFriendlySignupError(error, emailForAuth) {
  if (error?.code === 'auth/email-already-in-use') {
    return `Firebase Auth hesabı ${emailForAuth} var, ancak şifre hatalı. Şifreyi kontrol edin.`;
  }
  if (error?.code === 'auth/weak-password') {
    return 'Şifre en az 6 karakter olmalıdır.';
  }
  if (error?.code === 'auth/operation-not-allowed') {
    return 'Firebase Auth Email/Password sağlayıcısı kapalı. Firebase Console içinde etkinleştirin.';
  }
  return getFriendlyAuthError(error, emailForAuth);
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
  let userProfile;
  try {
    userProfile = await ensureBootstrapAdminProfile(credential.user.uid);
  } catch {
    userProfile = buildBootstrapAdminProfile(credential.user.uid);
  }
  return { credential, userProfile };
}

function buildBootstrapAdminProfile(uid) {
  return {
    uid,
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    role: 'super_admin',
    active: true,
    createdAt: new Date().toISOString(),
  };
}

function isBootstrapAdminUser(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

function persistBootstrapAdminSession(uid) {
  return persistSession({
    uid,
    role: 'super_admin',
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    courierId: null,
    name: 'Dexa Admin',
  });
}

function usernameFromEmail(email) {
  return String(email || '').trim().toLowerCase().split('@')[0] || 'kurye';
}

function persistSessionFromAuthUser(user) {
  const email = user?.email?.toLowerCase() || '';
  if (email === ADMIN_EMAIL) {
    return persistBootstrapAdminSession(user.uid);
  }

  const username = usernameFromEmail(email);
  return persistCourierSession({
    uid: user.uid,
    username,
    email,
    courierProfile: buildCourierProfiles({ uid: user.uid, username, email }).courierProfile,
  });
}

async function ensureCourierSelfProfile({ uid, username, email }) {
  const { userProfile, courierProfile } = buildCourierProfiles({ uid, username, email });

  await setDocument(collections.users, uid, {
    ...userProfile,
    createdAt: new Date().toISOString(),
  });

  await setDocument(collections.couriers, courierProfile.id, {
    uid,
    fullName: courierProfile.fullName,
    username,
    phone: '',
    active: true,
    status: 'Mesai Bitti',
    currentStatus: 'Mesai Bitti',
    restaurantId: null,
    shift: '10:00 - 18:00',
    startTime: null,
    endTime: null,
    plannedHours: 8,
    workedToday: 0,
    weeklyHours: 0,
    monthlyHours: 0,
    distanceMeters: 999,
    createdAt: new Date().toISOString(),
  });

  return { userProfile, courierProfile };
}

function buildCourierProfiles({ uid, username, email }) {
  const courierId = `cr-${uid.slice(0, 10)}`;
  const displayName = username
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || username;

  return {
    userProfile: {
      uid,
      username,
      email,
      role: 'courier',
      active: true,
    },
    courierProfile: {
      id: courierId,
      uid,
      fullName: displayName,
    },
  };
}

function persistCourierSession({ uid, username, email, courierProfile }) {
  return persistSession({
    uid,
    role: 'courier',
    username,
    email,
    courierId: courierProfile?.id || `cr-${uid.slice(0, 10)}`,
    name: courierProfile?.fullName || username,
  });
}

async function createMissingCourierAccount({ emailForAuth, passwordValue, loginValue }) {
  const credential = await createUserWithEmailAndPassword(auth, emailForAuth, passwordValue);
  const username = loginValue.includes('@') ? loginValue.split('@')[0] : loginValue;
  let profiles;
  try {
    profiles = await ensureCourierSelfProfile({
      uid: credential.user.uid,
      username,
      email: emailForAuth,
    });
  } catch {
    profiles = buildCourierProfiles({ uid: credential.user.uid, username, email: emailForAuth });
  }
  return { credential, ...profiles };
}

function getFriendlyFirestoreError(error) {
  if (error?.code === 'permission-denied') {
    return 'Firestore izinleri eksik. Firebase Console veya CLI ile güncel firestore.rules dosyasını yayınlayın.';
  }
  return error?.message || 'Kullanıcı profili okunamadı.';
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
  let selfCourierProfile = null;
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
      try {
        const selfCreated = await createMissingCourierAccount({ emailForAuth, passwordValue, loginValue });
        credential = selfCreated.credential;
        bootstrappedProfile = selfCreated.userProfile;
        selfCourierProfile = selfCreated.courierProfile;
      } catch (signupError) {
        throw new Error(isInvalidCredential(error) ? getFriendlySignupError(signupError, emailForAuth) : getFriendlyAuthError(error, emailForAuth));
      }
    }
  }

  if (isBootstrapAdminLogin(emailForAuth, passwordValue)) {
    try {
      const userProfile = bootstrappedProfile || await getDocument(collections.users, credential.user.uid);
      if (!userProfile) {
        try {
          await ensureBootstrapAdminProfile(credential.user.uid);
        } catch {
          // Rules may not be deployed yet. Let the bootstrap admin enter; Firestore setup can be fixed from README steps.
        }
      }
    } catch {
      // Same as above: Auth succeeded, but Firestore rules/profile are not ready yet.
    }
    return persistBootstrapAdminSession(credential.user.uid);
  }

  let userProfile = bootstrappedProfile;
  if (!userProfile) {
    try {
      userProfile = await getDocument(collections.users, credential.user.uid);
    } catch (error) {
      return persistSessionFromAuthUser(credential.user);
    }
  }

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
    return persistSessionFromAuthUser(credential.user);
  }

  if (!userProfile.active) {
    await signOut(auth);
    throw new Error('Hesap aktif değil.');
  }

  let courierProfile = selfCourierProfile;
  if (!courierProfile && userProfile.role === 'courier') {
    try {
      courierProfile = await getCourierByUid(credential.user.uid);
    } catch {
      courierProfile = buildCourierProfiles({
        uid: credential.user.uid,
        username: userProfile.username || loginValue,
        email: userProfile.email || emailForAuth,
      }).courierProfile;
    }
  }

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

      let userProfile = null;
      try {
        userProfile = await getDocument(collections.users, user.uid);
      } catch {
        resolve(persistSessionFromAuthUser(user));
        return;
      }

      if (!userProfile && isBootstrapAdminUser(user)) {
        resolve(persistBootstrapAdminSession(user.uid));
        return;
      }
      if (!userProfile) {
        resolve(persistSessionFromAuthUser(user));
        return;
      }
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

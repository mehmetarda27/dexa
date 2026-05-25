import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseEnabled } from './firebase';
import { collections, getDocument } from './firestoreService';
import { getCourierByUid } from './courierService';
import { findLocalUser } from './localUserStore';
import { envValidation } from '../config/env';

const SESSION_KEY = 'dexa.session';

function persistSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function resolveLoginEmail(username) {
  return username.includes('@') ? username : `${username}@dexa.local`;
}

function loginLocally(username, password) {
  const localUsername = import.meta.env.VITE_LOCAL_ADMIN_USERNAME;
  const localPassword = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD;
  const localRole = import.meta.env.VITE_LOCAL_ADMIN_ROLE || 'super_admin';
  const localName = import.meta.env.VITE_LOCAL_ADMIN_NAME || 'Dexa Admin';

  if (localUsername && localPassword && username === localUsername && password === localPassword) {
    return persistSession({
      role: localRole,
      username: localUsername,
      name: localName,
      uid: 'local-bootstrap-admin',
      email: `${localUsername}@dexa.local`,
    });
  }

  const localUser = findLocalUser(username, password);
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

  if (username && password) {
    throw new Error('Kullanıcı adı veya şifre hatalı.');
  }
  throw new Error('Kullanıcı adı veya şifre hatalı.');
}

export async function login(username, password) {
  const normalizedUsername = username.trim().toLowerCase();

  if (!firebaseEnabled) {
    if (envValidation.hasBlockingProductionIssue) {
      throw new Error('Firebase ayarları eksik. Vercel Environment Variables alanlarına Firebase config değerlerini ekleyin.');
    }
    return loginLocally(normalizedUsername, password);
  }

  const credential = await signInWithEmailAndPassword(auth, resolveLoginEmail(normalizedUsername), password);
  const userProfile = await getDocument(collections.users, credential.user.uid);

  if (!userProfile?.active) {
    await signOut(auth);
    throw new Error('Hesap aktif değil.');
  }

  const courierProfile = userProfile.role === 'courier' ? await getCourierByUid(credential.user.uid) : null;

  return persistSession({
    uid: credential.user.uid,
    role: userProfile.role,
    username: userProfile.username,
    email: userProfile.email,
    courierId: courierProfile?.id || null,
    name: courierProfile?.fullName || userProfile.username,
  });
}

export async function resetPassword(emailOrUsername) {
  const value = emailOrUsername.trim().toLowerCase();
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

import { appEnv } from '../config/env';
import { resolveLoginEmail } from './authService';
import { firebaseEnabled } from './firebase';
import { collections, setDocument } from './firestoreService';

function getFriendlyProvisioningError(error) {
  if (error?.code === 'EMAIL_EXISTS') {
    return 'Bu kullanıcı adıyla Firebase Auth hesabı zaten var. Farklı kullanıcı adı deneyin veya mevcut hesabı düzenleyin.';
  }
  if (error?.code === 'WEAK_PASSWORD') {
    return 'Şifre en az 6 karakter olmalıdır.';
  }
  if (error?.code === 'OPERATION_NOT_ALLOWED') {
    return 'Firebase Auth Email/Password sağlayıcısı kapalı. Firebase Console içinde etkinleştirin.';
  }
  if (error?.code === 'permission-denied') {
    return 'Firestore izinleri eksik. Güncel firestore.rules dosyasını Firebase’e yayınlayın.';
  }
  return error?.message || 'Kurye hesabı oluşturulamadı.';
}

async function createFirebaseAuthUser(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${appEnv.firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw { code: result?.error?.message || 'AUTH_CREATE_FAILED' };
  }
  return result;
}

export async function provisionCourierAccount(payload) {
  if (!firebaseEnabled) return null;

  const username = payload.username.trim().toLowerCase();
  const email = resolveLoginEmail(username);

  try {
    const authUser = await createFirebaseAuthUser(email, payload.password);
    const uid = authUser.localId;
    const courierId = `cr-${uid.slice(0, 10)}`;

    try {
      await setDocument(collections.users, uid, {
        uid,
        username,
        email,
        role: 'courier',
        active: true,
        createdAt: new Date().toISOString(),
      });

      await setDocument(collections.couriers, courierId, {
        uid,
        fullName: payload.fullName,
        username,
        phone: payload.phone,
        active: true,
        status: payload.currentStatus || 'Mesai Bitti',
        currentStatus: payload.currentStatus || 'Mesai Bitti',
        restaurantId: payload.restaurantId,
        shift: payload.shift || '10:00 - 18:00',
        startTime: null,
        endTime: null,
        plannedHours: 8,
        workedToday: 0,
        weeklyHours: 0,
        monthlyHours: 0,
        distanceMeters: 999,
      });
    } catch {
      // Auth account is enough for login; Firestore profile can be completed after rules are deployed.
    }

    return { id: courierId, uid, email };
  } catch (error) {
    throw new Error(getFriendlyProvisioningError(error));
  }
}

import { collections, getDocument, setDocument, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getUserProfile(uid) {
  if (!firebaseEnabled) return null;
  return getDocument(collections.users, uid);
}

export async function createUserProfile(uid, payload) {
  const user = {
    uid,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    active: payload.active ?? true,
    createdAt: payload.createdAt,
  };

  if (!firebaseEnabled) return user;
  return setDocument(collections.users, uid, user);
}

export async function updateUserProfile(uid, payload) {
  if (!firebaseEnabled) return { uid, ...payload };
  return updateDocument(collections.users, uid, payload);
}

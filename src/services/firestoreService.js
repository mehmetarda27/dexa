import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, requireFirebase, serverTimestamp } from './firebase';

export const collections = {
  users: 'users',
  couriers: 'couriers',
  restaurants: 'restaurants',
  assignments: 'assignments',
  shifts: 'shifts',
  breaks: 'breaks',
  earnings: 'earnings',
  reports: 'reports',
  announcements: 'announcements',
  notifications: 'notifications',
  auditLogs: 'auditLogs',
  offlineQueue: 'offlineQueue',
};

export function now() {
  return serverTimestamp();
}

export async function listDocuments(collectionName, constraints = []) {
  requireFirebase();
  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getDocument(collectionName, id) {
  requireFirebase();
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function createDocument(collectionName, payload) {
  requireFirebase();
  const ref = await addDoc(collection(db, collectionName), {
    ...payload,
    createdAt: payload.createdAt || now(),
  });
  return { id: ref.id, ...payload };
}

export async function setDocument(collectionName, id, payload) {
  requireFirebase();
  await setDoc(doc(db, collectionName, id), payload, { merge: true });
  return { id, ...payload };
}

export async function updateDocument(collectionName, id, payload) {
  requireFirebase();
  await updateDoc(doc(db, collectionName, id), {
    ...payload,
    updatedAt: now(),
  });
  return { id, ...payload };
}

export async function removeDocument(collectionName, id) {
  requireFirebase();
  await deleteDoc(doc(db, collectionName, id));
  return id;
}

export async function runFirestoreTransaction(callback) {
  requireFirebase();
  return runTransaction(db, callback);
}

export const firestoreQuery = {
  where,
  orderBy,
  limit,
};

import { couriers as localCouriers } from '../data/couriers';
import { collections, createDocument, firestoreQuery, getDocument, listDocuments, setDocument, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getCouriers() {
  if (!firebaseEnabled) return localCouriers;
  return listDocuments(collections.couriers, [firestoreQuery.orderBy('fullName', 'asc')]);
}

export async function getCourierById(courierId) {
  if (!firebaseEnabled) return localCouriers.find((courier) => courier.id === courierId) || null;
  return getDocument(collections.couriers, courierId);
}

export async function getCourierByUid(uid) {
  if (!firebaseEnabled) return null;
  const results = await listDocuments(collections.couriers, [firestoreQuery.where('uid', '==', uid), firestoreQuery.limit(1)]);
  return results[0] || null;
}

export async function createCourier(payload) {
  const courier = {
    uid: payload.uid,
    fullName: payload.fullName,
    username: payload.username,
    phone: payload.phone,
    active: payload.active ?? true,
    currentStatus: payload.currentStatus || 'Mesai Bitti',
  };

  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...courier };
  return createDocument(collections.couriers, courier);
}

export async function updateCourier(courierId, payload) {
  if (!firebaseEnabled) return { id: courierId, ...payload };
  return updateDocument(collections.couriers, courierId, payload);
}

export async function setCourierActive(courierId, active) {
  return updateCourier(courierId, { active });
}

export async function setCourierStatus(courierId, currentStatus) {
  if (!firebaseEnabled) return { id: courierId, currentStatus };
  return setDocument(collections.couriers, courierId, { currentStatus });
}

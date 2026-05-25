import { announcements as localAnnouncements } from '../data/announcements';
import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getAnnouncementsForCourier(courierId) {
  if (!firebaseEnabled) {
    return localAnnouncements.filter((announcement) => announcement.target === 'all' || announcement.target === courierId);
  }

  const general = await listDocuments(collections.announcements, [firestoreQuery.where('targetType', '==', 'all')]);
  const direct = await listDocuments(collections.announcements, [firestoreQuery.where('targetCourierId', '==', courierId)]);
  return [...general, ...direct].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getAnnouncements() {
  if (!firebaseEnabled) return localAnnouncements;
  return listDocuments(collections.announcements, [firestoreQuery.orderBy('createdAt', 'desc')]);
}

export async function createAnnouncement(payload) {
  const announcement = {
    title: payload.title,
    content: payload.content,
    targetType: payload.targetType || 'all',
    targetCourierId: payload.targetCourierId || null,
    readBy: [],
  };

  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...announcement };
  return createDocument(collections.announcements, announcement);
}

export async function markAnnouncementRead(announcement, courierId) {
  const readBy = Array.from(new Set([...(announcement.readBy || []), courierId]));
  if (!firebaseEnabled) return { ...announcement, readBy };
  return updateDocument(collections.announcements, announcement.id, { readBy });
}

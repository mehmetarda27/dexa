import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export const NOTIFICATION_TYPES = {
  assignmentCreated: 'assignment_created',
  assignmentUpdated: 'assignment_updated',
  assignmentCancelled: 'assignment_cancelled',
  announcement: 'announcement',
  shiftLate: 'shift_late',
  shiftNoShow: 'shift_no_show',
};

function toTurkishDateLabel(date) {
  const today = new Date();
  const target = new Date(`${date}T12:00:00`);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (target.toDateString() === today.toDateString()) return 'Bugün';
  if (target.toDateString() === tomorrow.toDateString()) return 'Yarın';
  return target.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' });
}

export function buildNotificationPayload({
  userId,
  type,
  title,
  message,
  actorRole = 'admin',
  entityType = null,
  entityId = null,
  metadata = {},
}) {
  return {
    userId,
    type,
    title,
    message,
    actorRole,
    entityType,
    entityId,
    metadata,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    delivery: {
      inApp: true,
      pushReady: true,
      fcmTokenSent: false,
    },
  };
}

export function assignmentNotification({ assignment, restaurant, type }) {
  const restaurantName = restaurant?.name || 'restoran';
  const dateLabel = toTurkishDateLabel(assignment.date);
  const timeRange = `${assignment.startTime} - ${assignment.endTime}`;
  const base = {
    userId: assignment.courierId,
    actorRole: 'admin',
    entityType: 'assignments',
    entityId: assignment.id,
    metadata: {
      assignmentId: assignment.id,
      restaurantId: assignment.restaurantId,
      date: assignment.date,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
    },
  };

  if (type === NOTIFICATION_TYPES.assignmentUpdated) {
    return buildNotificationPayload({
      ...base,
      type,
      title: 'Vardiyan güncellendi',
      message: `${dateLabel} ${timeRange} ${restaurantName} vardiyan güncellendi.`,
    });
  }

  if (type === NOTIFICATION_TYPES.assignmentCancelled) {
    return buildNotificationPayload({
      ...base,
      type,
      title: 'Vardiyan iptal edildi',
      message: `${dateLabel} ${timeRange} ${restaurantName} vardiyan iptal edildi.`,
    });
  }

  return buildNotificationPayload({
    ...base,
    type: NOTIFICATION_TYPES.assignmentCreated,
    title: 'Yeni vardiya oluşturuldu',
    message: `${dateLabel} ${timeRange} arasında ${restaurantName} vardiyan oluşturuldu.`,
  });
}

export function announcementNotification({ announcement, courierId }) {
  return buildNotificationPayload({
    userId: courierId,
    type: NOTIFICATION_TYPES.announcement,
    title: 'Yeni duyuru var',
    message: announcement.title,
    actorRole: 'admin',
    entityType: 'announcements',
    entityId: announcement.id,
    metadata: { announcementId: announcement.id },
  });
}

export function shiftWarningNotification({ assignment, restaurant, type }) {
  const late = type === NOTIFICATION_TYPES.shiftLate;
  return buildNotificationPayload({
    userId: assignment.courierId,
    type,
    title: late ? 'Vardiya saatin geçti' : 'Mesai başlamadı',
    message: late
      ? 'Vardiya saatin geçti, mesai başlatman gerekiyor.'
      : 'Mesaiye başlamadığın için admin uyarısı oluştu.',
    actorRole: 'system',
    entityType: 'assignments',
    entityId: assignment.id,
    metadata: {
      assignmentId: assignment.id,
      restaurantId: restaurant?.id || assignment.restaurantId,
      date: assignment.date,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
    },
  });
}

export async function getNotificationsForUser(userId) {
  if (!firebaseEnabled) return [];
  return listDocuments(collections.notifications, [
    firestoreQuery.where('userId', '==', userId),
    firestoreQuery.orderBy('createdAt', 'desc'),
  ]);
}

export async function getSentNotifications() {
  if (!firebaseEnabled) return [];
  return listDocuments(collections.notifications, [firestoreQuery.orderBy('createdAt', 'desc')]);
}

export async function createNotification(payload) {
  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...payload };
  return createDocument(collections.notifications, payload);
}

export async function markNotificationRead(notificationId) {
  const payload = { read: true, readAt: new Date().toISOString() };
  if (!firebaseEnabled) return { id: notificationId, ...payload };
  return updateDocument(collections.notifications, notificationId, payload);
}

import { calculateWorkedMinutes } from '../utils/dateTime';
import { writeAuditLog } from './auditLogService';
import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getBreaksForShift(shiftId) {
  if (!firebaseEnabled) return [];
  return listDocuments(collections.breaks, [
    firestoreQuery.where('shiftId', '==', shiftId),
    firestoreQuery.orderBy('startedAt', 'asc'),
  ]);
}

export async function startBreakRecord(shift, actor = {}) {
  if (shift.status !== 'working') {
    throw new Error('Mola sadece çalışan mesai üzerinde başlatılabilir.');
  }

  const payload = {
    courierId: shift.courierId,
    shiftId: shift.id,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMinutes: 0,
    status: 'active',
  };

  const created = firebaseEnabled ? await createDocument(collections.breaks, payload) : { id: crypto.randomUUID(), ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'courier',
    action: 'break_started',
    entityType: 'breaks',
    entityId: created.id,
    metadata: { shiftId: shift.id },
  });
  return created;
}

export async function endBreakRecord(breakRecord, actor = {}) {
  if (!breakRecord || breakRecord.status !== 'active') {
    throw new Error('Aktif mola kaydı bulunamadı.');
  }

  const endedAt = new Date().toISOString();
  const payload = {
    endedAt,
    durationMinutes: calculateWorkedMinutes(breakRecord.startedAt, endedAt, 0),
    status: 'finished',
  };

  const updated = firebaseEnabled ? await updateDocument(collections.breaks, breakRecord.id, payload) : { ...breakRecord, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'courier',
    action: 'break_finished',
    entityType: 'breaks',
    entityId: breakRecord.id,
    metadata: { shiftId: breakRecord.shiftId, durationMinutes: payload.durationMinutes },
  });
  return updated;
}

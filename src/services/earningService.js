import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { calculateEarnings, HOURLY_RATE } from './earningsService';
import { firebaseEnabled } from './firebase';
import { writeAuditLog } from './auditLogService';

export async function getEarnings(filters = {}) {
  if (!firebaseEnabled) return [];
  const constraints = [];
  if (filters.courierId) constraints.push(firestoreQuery.where('courierId', '==', filters.courierId));
  if (filters.shiftId) constraints.push(firestoreQuery.where('shiftId', '==', filters.shiftId));
  if (filters.approvalStatus) constraints.push(firestoreQuery.where('approvalStatus', '==', filters.approvalStatus));
  return listDocuments(collections.earnings, constraints);
}

export async function createEarning(payload) {
  const totalHours = Number(payload.totalHours || 0);
  const earning = {
    courierId: payload.courierId,
    shiftId: payload.shiftId,
    hourlyRate: payload.hourlyRate || HOURLY_RATE,
    totalHours,
    totalAmount: payload.totalAmount || calculateEarnings(totalHours),
    approvalStatus: payload.approvalStatus || 'pending',
    finalizedAt: null,
  };

  if (!firebaseEnabled) return { id: crypto.randomUUID(), ...earning };
  return createDocument(collections.earnings, earning);
}

export async function approveEarning(earningId, actor = {}) {
  const payload = {
    approvalStatus: 'approved',
    finalizedAt: new Date().toISOString(),
    approvedBy: actor.uid,
  };
  const updated = firebaseEnabled ? await updateDocument(collections.earnings, earningId, payload) : { id: earningId, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'earning_approved',
    entityType: 'earnings',
    entityId: earningId,
  });
  return updated;
}

export async function rejectEarning(earningId, reason, actor = {}) {
  const payload = {
    approvalStatus: 'rejected',
    rejectionReason: reason,
    rejectedBy: actor.uid,
    rejectedAt: new Date().toISOString(),
  };
  const updated = firebaseEnabled ? await updateDocument(collections.earnings, earningId, payload) : { id: earningId, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'earning_rejected',
    entityType: 'earnings',
    entityId: earningId,
    metadata: { reason },
  });
  return updated;
}

export async function updateEarning(earningId, payload) {
  if (!firebaseEnabled) return { id: earningId, ...payload };
  return updateDocument(collections.earnings, earningId, payload);
}

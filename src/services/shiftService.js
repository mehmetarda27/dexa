import { calculateWorkedMinutes, isToday } from '../utils/dateTime';
import { writeAuditLog } from './auditLogService';
import { endBreakRecord, startBreakRecord } from './breakService';
import { createEarning } from './earningService';
import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';
import { assertWithinRestaurantRadius } from './locationService';
import { enqueueOfflineOperation, isOnline } from './offlineQueueService';
import { getAssignmentTimingStatus, SHIFT_STATUS } from './timeService';

const pendingActions = new Set();

async function withSingleFlight(key, action) {
  if (pendingActions.has(key)) {
    throw new Error('İşlem zaten devam ediyor. Lütfen bekleyin.');
  }
  pendingActions.add(key);
  try {
    return await action();
  } finally {
    pendingActions.delete(key);
  }
}

export async function getShifts(filters = {}) {
  if (!firebaseEnabled) return [];
  const constraints = [];
  if (filters.courierId) constraints.push(firestoreQuery.where('courierId', '==', filters.courierId));
  if (filters.assignmentId) constraints.push(firestoreQuery.where('assignmentId', '==', filters.assignmentId));
  if (filters.status) constraints.push(firestoreQuery.where('status', '==', filters.status));
  constraints.push(firestoreQuery.orderBy('startedAt', 'desc'));
  return listDocuments(collections.shifts, constraints);
}

export async function getOpenShift(courierId) {
  const openStatuses = ['working', 'break'];
  const shifts = await getShifts({ courierId });
  return shifts.find((shift) => openStatuses.includes(shift.status)) || null;
}

export function getPlannedShiftStatus(assignment, shifts = []) {
  return getAssignmentTimingStatus(assignment, shifts).status;
}

export function isLateAssignment(assignment, shifts = []) {
  return getPlannedShiftStatus(assignment, shifts) === SHIFT_STATUS.late;
}

export function isNoShowAssignment(assignment, shifts = []) {
  return getPlannedShiftStatus(assignment, shifts) === SHIFT_STATUS.noShow;
}

export async function startShift({ courierId, restaurant, assignment, position, actor = {} }) {
  return withSingleFlight(`start:${courierId}`, async () => {
    if (!assignment) throw new Error('Bugün vardiya yok.');
    if (!isToday(assignment.date)) throw new Error('Sadece bugünkü vardiyada mesai işlemi yapılabilir.');
    assertWithinRestaurantRadius(position, restaurant, 'Mesai başlatma');

    if (!isOnline()) {
      return enqueueOfflineOperation({ actorUid: actor.uid, actorRole: actor.role || 'courier', type: 'shift_start', payload: { courierId, assignmentId: assignment.id } });
    }

    const openShift = await getOpenShift(courierId);
    if (openShift) throw new Error('Mesai zaten açık.');

    const shift = {
      courierId,
      restaurantId: restaurant.id,
      assignmentId: assignment.id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      totalBreakMinutes: 0,
      totalWorkMinutes: 0,
      status: 'working',
      approvedByAdmin: false,
    };

    const created = firebaseEnabled ? await createDocument(collections.shifts, shift) : { id: crypto.randomUUID(), ...shift };
    await writeAuditLog({
      actorUid: actor.uid,
      actorRole: actor.role || 'courier',
      action: 'shift_started',
      entityType: 'shifts',
      entityId: created.id,
      metadata: { assignmentId: assignment.id, restaurantId: restaurant.id },
    });
    return created;
  });
}

export async function startBreak(shift, actor = {}) {
  return withSingleFlight(`break-start:${shift.id}`, async () => {
    const breakRecord = await startBreakRecord(shift, actor);
    const payload = { status: 'break', activeBreakId: breakRecord.id };
    return firebaseEnabled ? updateDocument(collections.shifts, shift.id, payload) : { ...shift, ...payload };
  });
}

export async function endBreak(shift, breakRecord, actor = {}) {
  return withSingleFlight(`break-end:${shift.id}`, async () => {
    const finishedBreak = await endBreakRecord(breakRecord, actor);
    const payload = {
      status: 'working',
      activeBreakId: null,
      totalBreakMinutes: Number(shift.totalBreakMinutes || 0) + Number(finishedBreak.durationMinutes || 0),
    };
    return firebaseEnabled ? updateDocument(collections.shifts, shift.id, payload) : { ...shift, ...payload };
  });
}

export async function endShift({ shift, restaurant, position, actor = {} }) {
  return withSingleFlight(`end:${shift.id}`, async () => {
    assertWithinRestaurantRadius(position, restaurant, 'Mesai bitirme');

    if (!isOnline()) {
      return enqueueOfflineOperation({ actorUid: actor.uid, actorRole: actor.role || 'courier', type: 'shift_end', payload: { shiftId: shift.id } });
    }

    const endedAt = new Date().toISOString();
    const totalWorkMinutes = calculateWorkedMinutes(shift.startedAt, endedAt, shift.totalBreakMinutes);
    const payload = {
      endedAt,
      totalWorkMinutes,
      status: 'finished',
    };

    const updatedShift = firebaseEnabled ? await updateDocument(collections.shifts, shift.id, payload) : { ...shift, ...payload };
    await createEarning({
      courierId: shift.courierId,
      shiftId: shift.id,
      totalHours: Number((totalWorkMinutes / 60).toFixed(2)),
      approvalStatus: 'pending',
    });
    await writeAuditLog({
      actorUid: actor.uid,
      actorRole: actor.role || 'courier',
      action: 'shift_finished',
      entityType: 'shifts',
      entityId: shift.id,
      metadata: { totalWorkMinutes },
    });
    return updatedShift;
  });
}

export async function approveShift(shiftId, actor = {}) {
  const payload = { approvedByAdmin: true, approvedBy: actor.uid, approvedAt: new Date().toISOString() };
  const updated = firebaseEnabled ? await updateDocument(collections.shifts, shiftId, payload) : { id: shiftId, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'shift_approved',
    entityType: 'shifts',
    entityId: shiftId,
  });
  return updated;
}

export async function rejectShift(shiftId, reason, actor = {}) {
  const payload = { approvedByAdmin: false, approvalStatus: 'rejected', rejectionReason: reason };
  const updated = firebaseEnabled ? await updateDocument(collections.shifts, shiftId, payload) : { id: shiftId, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'shift_rejected',
    entityType: 'shifts',
    entityId: shiftId,
    metadata: { reason },
  });
  return updated;
}

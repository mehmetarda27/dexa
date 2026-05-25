import { todayISO, tomorrowISO, shiftWindowMinutes, windowsOverlap } from '../utils/dateTime';
import { assertNoValidationErrors, validateAssignmentForm } from '../utils/validation';
import { writeAuditLog } from './auditLogService';
import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

export async function getAssignments(filters = {}) {
  if (!firebaseEnabled) return [];
  const constraints = [];
  if (filters.courierId) constraints.push(firestoreQuery.where('courierId', '==', filters.courierId));
  if (filters.restaurantId) constraints.push(firestoreQuery.where('restaurantId', '==', filters.restaurantId));
  if (filters.date) constraints.push(firestoreQuery.where('date', '==', filters.date));
  if (filters.status) constraints.push(firestoreQuery.where('status', '==', filters.status));
  constraints.push(firestoreQuery.orderBy('date', 'desc'));
  return listDocuments(collections.assignments, constraints);
}

export async function getTodayAssignments(courierId) {
  return getAssignments({ courierId, date: todayISO() });
}

export async function getTomorrowAssignments(courierId) {
  return getAssignments({ courierId, date: tomorrowISO() });
}

export async function getUpcomingAssignments(courierId) {
  if (!firebaseEnabled) return [];
  return listDocuments(collections.assignments, [
    firestoreQuery.where('courierId', '==', courierId),
    firestoreQuery.where('date', '>', todayISO()),
    firestoreQuery.orderBy('date', 'asc'),
  ]);
}

export async function getPastAssignments(courierId) {
  if (!firebaseEnabled) return [];
  return listDocuments(collections.assignments, [
    firestoreQuery.where('courierId', '==', courierId),
    firestoreQuery.where('date', '<', todayISO()),
    firestoreQuery.orderBy('date', 'desc'),
  ]);
}

export function assertAssignmentEditable(assignment) {
  if (assignment.date < todayISO()) {
    throw new Error('Geçmiş vardiyalar düzenlenemez.');
  }
}

export async function findCourierAssignmentConflict({ courierId, date, startTime, endTime, excludeAssignmentId = null }) {
  const sameDay = await getAssignments({ courierId, date });
  const nextWindow = shiftWindowMinutes(startTime, endTime);

  return sameDay.find((assignment) => {
    if (assignment.id === excludeAssignmentId || assignment.status === 'cancelled') return false;
    return windowsOverlap(nextWindow, shiftWindowMinutes(assignment.startTime, assignment.endTime));
  });
}

export async function assertNoCourierAssignmentConflict(payload) {
  const conflict = await findCourierAssignmentConflict(payload);
  if (conflict) {
    throw new Error(`Çakışan vardiya bulundu: ${conflict.startTime} - ${conflict.endTime}.`);
  }
}

export async function createAssignment(payload, actor = {}) {
  const assignment = {
    courierId: payload.courierId,
    restaurantId: payload.restaurantId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: payload.status || 'planned',
  };

  assertNoValidationErrors(validateAssignmentForm(assignment));

  await assertNoCourierAssignmentConflict(assignment);

  const created = firebaseEnabled ? await createDocument(collections.assignments, assignment) : { id: crypto.randomUUID(), ...assignment };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'assignment_created',
    entityType: 'assignments',
    entityId: created.id,
    metadata: assignment,
  });
  return created;
}

export async function createBulkAssignments(assignments, actor = {}) {
  const created = [];
  for (const assignment of assignments) {
    created.push(await createAssignment(assignment, actor));
  }
  return created;
}

export async function updateAssignment(assignmentId, payload, actor = {}) {
  assertAssignmentEditable(payload);
  if (payload.courierId && payload.date && payload.startTime && payload.endTime) {
    await assertNoCourierAssignmentConflict({ ...payload, excludeAssignmentId: assignmentId });
  }

  const updated = firebaseEnabled ? await updateDocument(collections.assignments, assignmentId, payload) : { id: assignmentId, ...payload };
  await writeAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role || 'admin',
    action: 'assignment_updated',
    entityType: 'assignments',
    entityId: assignmentId,
    metadata: payload,
  });
  return updated;
}

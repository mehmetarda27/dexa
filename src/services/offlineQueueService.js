import { collections, createDocument, firestoreQuery, listDocuments, updateDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';
import { writeAuditLog } from './auditLogService';

const LOCAL_QUEUE_KEY = 'dexa.offlineQueue';

function readLocalQueue() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLocalQueue(items) {
  localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(items));
}

export function isOnline() {
  return navigator.onLine;
}

export async function enqueueOfflineOperation({ actorUid, actorRole, type, payload }) {
  const operation = {
    id: crypto.randomUUID(),
    actorUid,
    actorRole,
    type,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (!firebaseEnabled) {
    writeLocalQueue([...readLocalQueue(), operation]);
    return operation;
  }

  try {
    return await createDocument(collections.offlineQueue, operation);
  } catch {
    writeLocalQueue([...readLocalQueue(), operation]);
    return operation;
  }
}

export async function getPendingOfflineOperations(actorUid) {
  if (!firebaseEnabled) return readLocalQueue().filter((item) => item.actorUid === actorUid && item.status === 'pending');
  return listDocuments(collections.offlineQueue, [
    firestoreQuery.where('actorUid', '==', actorUid),
    firestoreQuery.where('status', '==', 'pending'),
  ]);
}

export async function markOfflineOperationSynced(operationId) {
  if (!firebaseEnabled) {
    writeLocalQueue(readLocalQueue().map((item) => (item.id === operationId ? { ...item, status: 'synced' } : item)));
    return operationId;
  }
  return updateDocument(collections.offlineQueue, operationId, { status: 'synced', syncedAt: new Date().toISOString() });
}

export async function processOfflineQueue({ actorUid, actorRole, handler }) {
  if (!isOnline()) return { processed: 0, queued: true };

  const pending = await getPendingOfflineOperations(actorUid);
  let processed = 0;

  for (const operation of pending) {
    await handler(operation);
    await markOfflineOperationSynced(operation.id);
    await writeAuditLog({
      actorUid,
      actorRole,
      action: 'offline_operation_synced',
      entityType: 'offlineQueue',
      entityId: operation.id,
      metadata: { type: operation.type },
    });
    processed += 1;
  }

  return { processed, queued: false };
}

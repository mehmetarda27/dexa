import { collections, createDocument } from './firestoreService';
import { firebaseEnabled } from './firebase';

function deviceInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    online: navigator.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function writeAuditLog({ actorUid, actorRole, action, entityType, entityId, metadata = {} }) {
  const log = {
    actorUid,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    device: deviceInfo(),
    createdAt: new Date().toISOString(),
  };

  if (!firebaseEnabled) {
    return { id: crypto.randomUUID(), ...log };
  }

  return createDocument(collections.auditLogs, log);
}

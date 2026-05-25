import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { announcements as initialAnnouncements } from '../data/announcements';
import { couriers as initialCouriers } from '../data/couriers';
import { restaurants as initialRestaurants } from '../data/restaurants';
import { shiftWindowMinutes, todayISO } from '../utils/dateTime';
import { calculateEarnings } from '../services/earningsService';
import { getAssignmentTimingStatus } from '../services/timeService';
import { updateLocalUser, upsertLocalUser } from '../services/localUserStore';
import { provisionCourierAccount } from '../services/accountProvisioningService';
import { getSession } from '../services/authService';
import {
  NOTIFICATION_TYPES,
  announcementNotification,
  assignmentNotification,
  shiftWarningNotification,
} from '../services/notificationService';

const OperationsContext = createContext(null);
const STORAGE_PREFIX = 'dexa.operations.';
const COURIER_DATA_RESET_KEY = 'dexa.migrations.clearCourierData.2026-05-25';
const COURIER_DATA_KEYS = [
  `${STORAGE_PREFIX}couriers`,
  `${STORAGE_PREFIX}assignments`,
  `${STORAGE_PREFIX}shifts`,
  `${STORAGE_PREFIX}breaks`,
  `${STORAGE_PREFIX}earnings`,
  `${STORAGE_PREFIX}notifications`,
  'dexa.localUsers',
];

function runCourierDataResetMigration() {
  try {
    if (localStorage.getItem(COURIER_DATA_RESET_KEY)) return;
    COURIER_DATA_KEYS.forEach((key) => localStorage.setItem(key, '[]'));
    localStorage.setItem(COURIER_DATA_RESET_KEY, new Date().toISOString());
  } catch {
    // The app can still boot if browser storage is unavailable.
  }
}

runCourierDataResetMigration();

function readStoredState(key, fallback) {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, initialValue) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const [value, setValue] = useState(() => readStoredState(key, initialValue));

  const setPersistentValue = useCallback((updater) => {
    setValue((current) => {
      const nextValue = typeof updater === 'function' ? updater(current) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextValue));
        window.dispatchEvent(new CustomEvent('dexa.operations.state', {
          detail: { key: storageKey, value: nextValue },
        }));
      } catch {
        // The in-memory flow still works if browser storage is unavailable.
      }
      return nextValue;
    });
  }, [storageKey]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key !== storageKey || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed storage from older builds or manual edits.
      }
    };

    const syncFromSameWindow = (event) => {
      if (event.detail?.key === storageKey) setValue(event.detail.value);
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('dexa.operations.state', syncFromSameWindow);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('dexa.operations.state', syncFromSameWindow);
    };
  }, [storageKey]);

  return [value, setPersistentValue];
}

function getAssignmentShiftDetails(assignment) {
  if (!assignment) {
    return {
      restaurantId: null,
      shift: 'Vardiya yok',
      startTime: null,
      endTime: null,
      plannedHours: 0,
    };
  }

  const windowMinutes = shiftWindowMinutes(assignment.startTime, assignment.endTime);
  return {
    restaurantId: assignment.restaurantId,
    shift: `${assignment.startTime} - ${assignment.endTime}`,
    startTime: assignment.startTime,
    endTime: assignment.endTime,
    plannedHours: Number(((windowMinutes.end - windowMinutes.start) / 60).toFixed(2)),
  };
}

function syncCouriersWithAssignments(couriers, assignments) {
  const activeAssignments = assignments
    .filter((assignment) => assignment.status !== 'cancelled' && assignment.date >= todayISO())
    .sort((first, second) => `${first.date} ${first.startTime}`.localeCompare(`${second.date} ${second.startTime}`));

  return couriers.map((courier) => {
    const nextAssignment = activeAssignments.find((assignment) => assignment.courierId === courier.id);
    const shiftDetails = getAssignmentShiftDetails(nextAssignment);
    return {
      ...courier,
      ...shiftDetails,
      restaurantId: shiftDetails.restaurantId || courier.restaurantId,
    };
  });
}

const ACTIVE_SHIFT_STATUSES = ['working', 'break'];
const ADMIN_NOTIFICATION_USER_ID = 'admin';

function formatTimeLabel(date = new Date()) {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatShiftEventMessage(courierName, eventType, createdAt) {
  const time = formatTimeLabel(new Date(createdAt));
  const labels = {
    shift_started: 'mesaiye başladı',
    break_started: 'molaya çıktı',
    break_finished: 'moladan döndü',
    shift_finished: 'mesaiyi bitirdi',
    shift_rejected: 'mesai girişi reddedildi',
    early_exit: 'erken çıkış yaptı',
    mock_location: 'şüpheli konum ile işlem denedi',
  };
  return `${courierName || 'Kurye'} ${labels[eventType] || 'vardiya işlemi yaptı'} - ${time}`;
}

function notificationKey(payload) {
  return payload.dedupeKey || [
    payload.userId,
    payload.type,
    payload.entityType,
    payload.entityId,
    payload.metadata?.eventType,
    payload.metadata?.assignmentId,
  ].filter(Boolean).join(':');
}

function shiftWindowEndIso(assignment) {
  if (!assignment?.date || !assignment?.endTime) return null;
  return new Date(`${assignment.date}T${assignment.endTime}:00`).toISOString();
}

function isEarlyShiftExit(assignment, endedAt) {
  const plannedEnd = shiftWindowEndIso(assignment);
  return plannedEnd ? new Date(endedAt) < new Date(plannedEnd) : false;
}

export function OperationsProvider({ children }) {
  const [admins, setAdmins] = usePersistentState('admins', []);
  const [auditLogs, setAuditLogs] = usePersistentState('auditLogs', []);
  const [couriers, setCouriers] = usePersistentState('couriers', initialCouriers);
  const [restaurants, setRestaurants] = usePersistentState('restaurants', initialRestaurants);
  const [assignments, setAssignments] = usePersistentState('assignments', []);
  const [announcements, setAnnouncements] = usePersistentState('announcements', initialAnnouncements);
  const [notifications, setNotifications] = usePersistentState('notifications', []);
  const [shifts, setShifts] = usePersistentState('shifts', []);
  const [breaks, setBreaks] = usePersistentState('breaks', []);
  const [earnings, setEarnings] = usePersistentState('earnings', []);
  const [shiftEvents, setShiftEvents] = usePersistentState('shiftEvents', []);
  const [pendingOfflineActions, setPendingOfflineActions] = usePersistentState('pendingOfflineActions', []);
  const [settings, setSettings] = usePersistentState('settings', { adminApprovalRequired: true });

  useEffect(() => {
    setCouriers((current) => syncCouriersWithAssignments(current, assignments));
  }, [assignments, setCouriers]);

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'courier' || !session?.courierId) return;

    setCouriers((current) => {
      if (current.some((courier) => courier.id === session.courierId || courier.uid === session.uid)) return current;
      const username = session.username || session.email?.split('@')[0] || 'kurye';
      const courier = {
        id: session.courierId,
        uid: session.uid,
        fullName: session.name || username,
        username,
        phone: '',
        active: true,
        status: 'Mesai Bitti',
        currentStatus: 'Mesai Bitti',
        restaurantId: null,
        shift: '10:00 - 18:00',
        startTime: null,
        endTime: null,
        plannedHours: 8,
        workedToday: 0,
        weeklyHours: 0,
        monthlyHours: 0,
        distanceMeters: 24,
      };
      return [courier, ...current];
    });

  }, [setCouriers]);

  const addAuditLog = useCallback((action, metadata = {}, actor = { name: 'Sistem', role: 'admin' }) => {
    const log = {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      action,
      actorName: actor.name || 'Sistem',
      actorRole: actor.role || 'admin',
      createdAt: new Date().toISOString(),
      metadata,
    };
    setAuditLogs((current) => [log, ...current]);
    return log;
  }, []);

  const pushNotification = useCallback((payload) => {
    const notification = {
      id: `ntf-${crypto.randomUUID().slice(0, 8)}`,
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    const key = notificationKey(notification);
    notification.dedupeKey = key;
    setNotifications((current) => (
      current.some((item) => item.dedupeKey === key || notificationKey(item) === key)
        ? current
        : [notification, ...current]
    ));
    return notification;
  }, []);

  const pushNotifications = useCallback((items) => {
    const created = items.map((payload) => ({
      id: `ntf-${crypto.randomUUID().slice(0, 8)}`,
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    })).map((item) => ({ ...item, dedupeKey: notificationKey(item) }));
    setNotifications((current) => {
      const existingKeys = new Set(current.map((item) => item.dedupeKey || notificationKey(item)));
      const uniqueCreated = created.filter((item) => !existingKeys.has(item.dedupeKey));
      return uniqueCreated.length ? [...uniqueCreated, ...current] : current;
    });
    return created;
  }, []);

  const markNotificationRead = useCallback((notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true, readAt: notification.readAt || new Date().toISOString() }
          : notification,
      ),
    );
  }, []);

  const markAllNotificationsRead = useCallback((userId = null) => {
    setNotifications((current) =>
      current.map((notification) =>
        userId && notification.userId !== userId
          ? notification
          : { ...notification, read: true, readAt: notification.readAt || new Date().toISOString() },
      ),
    );
  }, []);

  const addShiftEvent = useCallback((payload) => {
    const courier = couriers.find((item) => item.id === payload.courierId);
    const event = {
      id: payload.id || `evt-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: payload.createdAt || new Date().toISOString(),
      courierName: courier?.fullName || payload.courierName || 'Kurye',
      ...payload,
    };
    event.message = payload.message || formatShiftEventMessage(event.courierName, event.type, event.createdAt);

    setShiftEvents((current) => (
      current.some((item) => item.dedupeKey && item.dedupeKey === event.dedupeKey)
        ? current
        : [event, ...current].slice(0, 250)
    ));

    const adminNotificationTypes = {
      shift_started: 'shift_started',
      break_started: 'shift_break_started',
      break_finished: 'shift_break_finished',
      shift_finished: 'shift_finished',
      shift_rejected: 'shift_rejected',
      early_exit: 'shift_early_exit',
      mock_location: 'mock_location',
    };
    if (adminNotificationTypes[event.type]) {
      pushNotification({
        userId: ADMIN_NOTIFICATION_USER_ID,
        type: adminNotificationTypes[event.type],
        title: event.type === 'early_exit' ? 'Erken çıkış uyarısı' : 'Canlı vardiya bildirimi',
        message: event.message,
        actorRole: 'system',
        entityType: 'shifts',
        entityId: event.shiftId,
        metadata: {
          eventType: event.type,
          courierId: event.courierId,
          assignmentId: event.assignmentId,
          location: event.location || null,
          device: event.device || null,
        },
        dedupeKey: event.dedupeKey || `${event.type}:${event.shiftId}`,
      });
    }

    return event;
  }, [couriers, pushNotification, setShiftEvents]);

  const enqueuePendingOfflineAction = useCallback((payload) => {
    const action = {
      id: `off-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...payload,
    };
    setPendingOfflineActions((current) => [action, ...current]);
    addAuditLog('offline_action_queued', { type: action.type, courierId: action.courierId }, { name: 'Sistem', role: 'system' });
    return action;
  }, [addAuditLog, setPendingOfflineActions]);

  const updateSettings = useCallback((payload) => {
    setSettings((current) => ({ ...current, ...payload }));
    addAuditLog('settings_updated', payload);
  }, [addAuditLog, setSettings]);

  const addAdmin = useCallback((payload, actor = { role: 'super_admin', name: 'Super Admin' }) => {
    if (actor.role !== 'super_admin') throw new Error('Yeni admin oluşturmak için super admin yetkisi gerekir.');
    const admin = {
      id: `adm-${crypto.randomUUID().slice(0, 8)}`,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role || 'admin',
      active: true,
      createdAt: new Date().toISOString(),
    };
    setAdmins((current) => [admin, ...current]);
    addAuditLog('admin_created', { adminId: admin.id, email: admin.email }, actor);
    return admin;
  }, [addAuditLog]);

  const toggleAdminActive = useCallback((adminId, actor = { role: 'super_admin', name: 'Super Admin' }) => {
    if (actor.role !== 'super_admin') throw new Error('Admin durumunu değiştirmek için super admin yetkisi gerekir.');
    setAdmins((current) => current.map((admin) => (admin.id === adminId ? { ...admin, active: !admin.active } : admin)));
    addAuditLog('admin_status_changed', { adminId }, actor);
  }, [addAuditLog]);

  const addCourier = useCallback(async (payload) => {
    const provisioned = await provisionCourierAccount(payload);
    const courier = {
      id: provisioned?.id || `cr-${crypto.randomUUID().slice(0, 8)}`,
      uid: provisioned?.uid,
      fullName: payload.fullName,
      username: payload.username.trim().toLowerCase(),
      phone: payload.phone,
      password: payload.password,
      active: true,
      status: payload.currentStatus || 'Mesai Bitti',
      currentStatus: payload.currentStatus || 'Mesai Bitti',
      restaurantId: payload.restaurantId || null,
      shift: payload.shift || '10:00 - 18:00',
      startTime: null,
      endTime: null,
      plannedHours: 8,
      workedToday: 0,
      weeklyHours: 0,
      monthlyHours: 0,
      distanceMeters: 999,
    };
    setCouriers((current) => [courier, ...current]);
    upsertLocalUser({
      uid: `local-${courier.id}`,
      username: courier.username,
      password: courier.password,
      role: 'courier',
      name: courier.fullName,
      email: `${courier.username.trim().toLowerCase()}@dexa.com`,
      courierId: courier.id,
      active: courier.active,
    });
    addAuditLog('courier_created', { courierId: courier.id, fullName: courier.fullName });
    return courier;
  }, [addAuditLog]);

  const updateCourier = useCallback((courierId, payload) => {
    setCouriers((current) =>
      current.map((courier) =>
        courier.id === courierId
          ? { ...courier, ...payload, status: payload.currentStatus || payload.status || courier.status }
          : courier,
      ),
    );
    if (payload.username) {
      upsertLocalUser({
        uid: `local-${courierId}`,
        username: payload.username,
        password: payload.password,
        role: 'courier',
        name: payload.fullName,
        email: `${payload.username.trim().toLowerCase()}@dexa.com`,
        courierId,
        active: payload.active ?? true,
      });
    }
  }, []);

  const toggleCourierActive = useCallback((courierId) => {
    setCouriers((current) => current.map((courier) => {
      if (courier.id !== courierId) return courier;
      const active = !courier.active;
      updateLocalUser(courier.username, { active });
      return { ...courier, active };
    }));
    addAuditLog('courier_active_toggled', { courierId });
  }, [addAuditLog]);

  const addRestaurant = useCallback((payload) => {
    const restaurant = {
      id: `rst-${crypto.randomUUID().slice(0, 8)}`,
      name: payload.name,
      district: payload.district || 'Operasyon',
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      radius: Number(payload.radius || 100),
      status: 'Aktif',
      active: true,
    };
    setRestaurants((current) => [restaurant, ...current]);
    addAuditLog('restaurant_created', { restaurantId: restaurant.id, name: restaurant.name });
    return restaurant;
  }, [addAuditLog]);

  const updateRestaurant = useCallback((restaurantId, payload) => {
    setRestaurants((current) => current.map((restaurant) => (restaurant.id === restaurantId ? { ...restaurant, ...payload } : restaurant)));
    addAuditLog('restaurant_coordinates_updated', { restaurantId, lat: payload.lat, lng: payload.lng, radius: payload.radius });
  }, [addAuditLog]);

  const addAssignment = useCallback(async (payload) => {
    const localConflict = assignments.find((assignment) => {
      if (assignment.courierId !== payload.courierId || assignment.date !== payload.date || assignment.status === 'cancelled') return false;
      const [startA, endA] = [assignment.startTime, assignment.endTime].map((time) => Number(time.replace(':', '')));
      const [startB, endB] = [payload.startTime, payload.endTime].map((time) => Number(time.replace(':', '')));
      return startA < endB && startB < endA;
    });
    if (localConflict) throw new Error('Bu kurye için aynı saatlerde çakışan vardiya var.');

    const assignment = {
      id: `asg-${crypto.randomUUID().slice(0, 8)}`,
      status: 'planned',
      ...payload,
    };
    setAssignments((current) => [assignment, ...current]);
    pushNotification(assignmentNotification({
      assignment,
      restaurant: restaurants.find((restaurant) => restaurant.id === assignment.restaurantId),
      type: NOTIFICATION_TYPES.assignmentCreated,
    }));
    addAuditLog('assignment_created', assignment);
    return assignment;
  }, [addAuditLog, assignments, pushNotification, restaurants]);

  const updateAssignment = useCallback(async (assignmentId, payload) => {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) throw new Error('Vardiya bulunamadı.');
    if (target.status === 'active' && !payload.confirmStartedEdit) {
      throw new Error('Başlamış vardiya düzenleniyor. İşlemi onaylayarak tekrar deneyin.');
    }
    const localConflict = assignments.find((assignment) => {
      if (
        assignment.id === assignmentId
        || assignment.courierId !== payload.courierId
        || assignment.date !== payload.date
        || assignment.status === 'cancelled'
      ) {
        return false;
      }
      const [startA, endA] = [assignment.startTime, assignment.endTime].map((time) => Number(time.replace(':', '')));
      const [startB, endB] = [payload.startTime, payload.endTime].map((time) => Number(time.replace(':', '')));
      return startA < endB && startB < endA;
    });
    if (localConflict) throw new Error('Bu kurye için aynı saatlerde çakışan vardiya var.');
    const updatedAssignment = { ...target, ...payload, confirmStartedEdit: undefined };
    setAssignments((current) => current.map((assignment) => (assignment.id === assignmentId ? updatedAssignment : assignment)));
    pushNotification(assignmentNotification({
      assignment: updatedAssignment,
      restaurant: restaurants.find((restaurant) => restaurant.id === updatedAssignment.restaurantId),
      type: NOTIFICATION_TYPES.assignmentUpdated,
    }));
    addAuditLog('assignment_updated', { assignmentId, ...payload });
  }, [addAuditLog, assignments, pushNotification, restaurants]);

  const cancelAssignment = useCallback((assignmentId, reason = 'Admin tarafından iptal edildi') => {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) throw new Error('Vardiya bulunamadı.');
    if (target.status === 'active' && !window.confirm('Başlamış vardiya iptal edilecek. Devam edilsin mi?')) return;
    const cancelledAssignment = { ...target, status: 'cancelled', cancelReason: reason, cancelledAt: new Date().toISOString() };
    setAssignments((current) => current.map((assignment) => (assignment.id === assignmentId ? cancelledAssignment : assignment)));
    pushNotification(assignmentNotification({
      assignment: cancelledAssignment,
      restaurant: restaurants.find((restaurant) => restaurant.id === cancelledAssignment.restaurantId),
      type: NOTIFICATION_TYPES.assignmentCancelled,
    }));
    addAuditLog('assignment_cancelled', { assignmentId, reason });
  }, [addAuditLog, assignments, pushNotification, restaurants]);

  const addBulkAssignments = useCallback(async (items) => {
    const created = [];
    for (const item of items) {
      created.push(await addAssignment(item));
    }
    return created;
  }, [addAssignment]);

  const addAnnouncement = useCallback((payload) => {
    const announcement = {
      id: `ann-${crypto.randomUUID().slice(0, 8)}`,
      title: payload.title,
      description: payload.content,
      content: payload.content,
      target: payload.targetType === 'all' ? 'all' : payload.targetCourierId,
      targetType: payload.targetType,
      targetCourierId: payload.targetCourierId || null,
      date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    setAnnouncements((current) => [announcement, ...current]);
    const targets = payload.targetType === 'all'
      ? couriers.filter((courier) => courier.active).map((courier) => courier.id)
      : [payload.targetCourierId].filter(Boolean);
    pushNotifications(targets.map((courierId) => announcementNotification({ announcement, courierId })));
    addAuditLog('announcement_created', { announcementId: announcement.id, title: announcement.title });
    return announcement;
  }, [addAuditLog, couriers, pushNotifications]);

  const markAnnouncementRead = useCallback((announcementId, courierId) => {
    setAnnouncements((current) =>
      current.map((announcement) =>
        announcement.id === announcementId
          ? { ...announcement, readBy: Array.from(new Set([...(announcement.readBy || []), courierId])) }
          : announcement,
      ),
    );
  }, []);

  const startLocalShift = useCallback(({ courierId, restaurantId, assignmentId }) => {
    const existing = shifts.find((shift) => shift.courierId === courierId && ['working', 'break'].includes(shift.status));
    if (existing) throw new Error('Mesai zaten açık.');
    const shift = {
      id: `shf-${crypto.randomUUID().slice(0, 8)}`,
      courierId,
      restaurantId,
      assignmentId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      totalBreakMinutes: 0,
      totalWorkMinutes: 0,
      status: 'working',
      approvedByAdmin: false,
    };
    setShifts((current) => [shift, ...current]);
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              status: 'active',
              startedAt: shift.startedAt,
              lateStartedAt: getAssignmentTimingStatus(assignment, []).status === 'late' ? shift.startedAt : assignment.lateStartedAt,
            }
          : assignment,
      ),
    );
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? { ...courier, status: 'Çalışıyor' } : courier)));
    return shift;
  }, [shifts]);

  const startLocalBreak = useCallback((shiftId) => {
    const shift = shifts.find((item) => item.id === shiftId);
    if (!shift || shift.status !== 'working') throw new Error('Mola sadece açık mesaide başlatılabilir.');
    const breakRecord = {
      id: `brk-${crypto.randomUUID().slice(0, 8)}`,
      shiftId,
      courierId: shift.courierId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMinutes: 0,
      status: 'active',
    };
    setBreaks((current) => [breakRecord, ...current]);
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, status: 'break', activeBreakId: breakRecord.id } : item)));
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Molada' } : courier)));
    return breakRecord;
  }, [shifts]);

  const endLocalBreak = useCallback((shiftId) => {
    const shift = shifts.find((item) => item.id === shiftId);
    const breakRecord = breaks.find((item) => item.shiftId === shiftId && item.status === 'active');
    if (!shift || !breakRecord) throw new Error('Aktif mola bulunamadı.');
    const endedAt = new Date();
    const durationMinutes = Math.max(0, Math.round((endedAt - new Date(breakRecord.startedAt)) / 60000));
    setBreaks((current) => current.map((item) => (item.id === breakRecord.id ? { ...item, endedAt: endedAt.toISOString(), durationMinutes, status: 'finished' } : item)));
    setShifts((current) =>
      current.map((item) =>
        item.id === shiftId
          ? { ...item, status: 'working', activeBreakId: null, totalBreakMinutes: Number(item.totalBreakMinutes || 0) + durationMinutes }
          : item,
      ),
    );
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Çalışıyor' } : courier)));
  }, [breaks, shifts]);

  const endLocalShift = useCallback((shiftId) => {
    const shift = shifts.find((item) => item.id === shiftId);
    if (!shift) throw new Error('Açık mesai bulunamadı.');
    const endedAt = new Date();
    const totalMinutes = Math.max(0, Math.round((endedAt - new Date(shift.startedAt)) / 60000) - Number(shift.totalBreakMinutes || 0));
    const totalHours = Number((totalMinutes / 60).toFixed(2));
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, endedAt: endedAt.toISOString(), totalWorkMinutes: totalMinutes, status: 'finished' } : item)));
    setAssignments((current) => current.map((assignment) => (assignment.id === shift.assignmentId ? { ...assignment, status: 'completed', completedAt: endedAt.toISOString() } : assignment)));
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Mesai Bitti', workedToday: totalHours } : courier)));
    const earning = {
      id: `ern-${crypto.randomUUID().slice(0, 8)}`,
      courierId: shift.courierId,
      shiftId,
      hourlyRate: 225,
      totalHours,
      totalAmount: calculateEarnings(totalHours),
      approvalStatus: 'pending',
    };
    setEarnings((current) => [earning, ...current]);
    return earning;
  }, [shifts]);

  const approveEarning = useCallback((earningId) => {
    setEarnings((current) => current.map((earning) => (earning.id === earningId ? { ...earning, approvalStatus: 'approved' } : earning)));
    addAuditLog('earning_approved', { earningId });
  }, [addAuditLog]);

  const rejectEarning = useCallback((earningId) => {
    setEarnings((current) => current.map((earning) => (earning.id === earningId ? { ...earning, approvalStatus: 'rejected' } : earning)));
    addAuditLog('earning_rejected', { earningId });
  }, [addAuditLog]);

  const startTrackedShift = useCallback(({ courierId, restaurantId, assignmentId, position = null, device = null }) => {
    if (!navigator.onLine) {
      return enqueuePendingOfflineAction({ type: 'shift_start', courierId, restaurantId, assignmentId, position, device });
    }
    const existing = shifts.find((shift) => shift.courierId === courierId && ACTIVE_SHIFT_STATUSES.includes(shift.status));
    if (existing) throw new Error('Mesai zaten açık.');

    const assignment = assignments.find((item) => item.id === assignmentId);
    const approvalStatus = settings.adminApprovalRequired ? 'pending' : 'approved';
    const nowIso = new Date().toISOString();
    const shift = {
      id: `shf-${crypto.randomUUID().slice(0, 8)}`,
      courierId,
      restaurantId,
      assignmentId,
      startedAt: nowIso,
      endedAt: null,
      totalBreakMinutes: 0,
      totalWorkMinutes: 0,
      status: 'working',
      approvalStatus,
      approvedByAdmin: approvalStatus === 'approved',
      approvedAt: approvalStatus === 'approved' ? nowIso : null,
      location: position,
      device,
    };
    setShifts((current) => [shift, ...current]);
    setAssignments((current) =>
      current.map((item) =>
        item.id === assignmentId
          ? {
              ...item,
              status: 'active',
              startedAt: nowIso,
              approvalStatus,
              lateStartedAt: getAssignmentTimingStatus(item, []).status === 'late' ? nowIso : item.lateStartedAt,
            }
          : item,
      ),
    );
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? { ...courier, status: 'Çalışıyor' } : courier)));
    addShiftEvent({
      type: 'shift_started',
      courierId,
      shiftId: shift.id,
      assignmentId,
      restaurantId,
      location: position,
      device,
      createdAt: nowIso,
      dedupeKey: `shift_started:${shift.id}`,
    });
    addAuditLog('shift_started', { courierId, shiftId: shift.id, assignmentId, restaurantId, approvalStatus, location: position, device });
    if (getAssignmentTimingStatus(assignment, []).status === 'late') {
      addAuditLog('shift_late_started', { courierId, shiftId: shift.id, assignmentId, startedAt: nowIso });
    }
    return shift;
  }, [addAuditLog, addShiftEvent, assignments, enqueuePendingOfflineAction, settings.adminApprovalRequired, shifts]);

  const startTrackedBreak = useCallback((shiftId, meta = {}) => {
    const shift = shifts.find((item) => item.id === shiftId);
    if (!shift || shift.status !== 'working') throw new Error('Mola sadece açık mesaide başlatılabilir.');
    if (!navigator.onLine) {
      return enqueuePendingOfflineAction({ type: 'break_start', courierId: shift.courierId, shiftId, ...meta });
    }
    const nowIso = new Date().toISOString();
    const breakRecord = {
      id: `brk-${crypto.randomUUID().slice(0, 8)}`,
      shiftId,
      courierId: shift.courierId,
      startedAt: nowIso,
      endedAt: null,
      durationMinutes: 0,
      status: 'active',
    };
    setBreaks((current) => [breakRecord, ...current]);
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, status: 'break', activeBreakId: breakRecord.id } : item)));
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Molada' } : courier)));
    addShiftEvent({ type: 'break_started', courierId: shift.courierId, shiftId, assignmentId: shift.assignmentId, restaurantId: shift.restaurantId, createdAt: nowIso, dedupeKey: `break_started:${breakRecord.id}`, ...meta });
    addAuditLog('break_started', { courierId: shift.courierId, shiftId, breakId: breakRecord.id, ...meta });
    return breakRecord;
  }, [addAuditLog, addShiftEvent, enqueuePendingOfflineAction, shifts]);

  const endTrackedBreak = useCallback((shiftId, meta = {}) => {
    const shift = shifts.find((item) => item.id === shiftId);
    const breakRecord = breaks.find((item) => item.shiftId === shiftId && item.status === 'active');
    if (!shift || !breakRecord) throw new Error('Aktif mola bulunamadı.');
    if (!navigator.onLine) {
      return enqueuePendingOfflineAction({ type: 'break_end', courierId: shift.courierId, shiftId, breakId: breakRecord.id, ...meta });
    }
    const endedAt = new Date();
    const endedAtIso = endedAt.toISOString();
    const durationMinutes = Math.max(0, Math.round((endedAt - new Date(breakRecord.startedAt)) / 60000));
    setBreaks((current) => current.map((item) => (item.id === breakRecord.id ? { ...item, endedAt: endedAtIso, durationMinutes, status: 'finished' } : item)));
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, status: 'working', activeBreakId: null, totalBreakMinutes: Number(item.totalBreakMinutes || 0) + durationMinutes } : item)));
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Çalışıyor' } : courier)));
    addShiftEvent({ type: 'break_finished', courierId: shift.courierId, shiftId, assignmentId: shift.assignmentId, restaurantId: shift.restaurantId, createdAt: endedAtIso, dedupeKey: `break_finished:${breakRecord.id}`, ...meta });
    addAuditLog('break_finished', { courierId: shift.courierId, shiftId, breakId: breakRecord.id, durationMinutes, ...meta });
  }, [addAuditLog, addShiftEvent, breaks, enqueuePendingOfflineAction, shifts]);

  const endTrackedShift = useCallback((shiftId, meta = {}) => {
    const shift = shifts.find((item) => item.id === shiftId);
    if (!shift) throw new Error('Açık mesai bulunamadı.');
    if (!navigator.onLine) {
      return enqueuePendingOfflineAction({ type: 'shift_end', courierId: shift.courierId, shiftId, ...meta });
    }
    const endedAt = new Date();
    const endedAtIso = endedAt.toISOString();
    const totalMinutes = Math.max(0, Math.round((endedAt - new Date(shift.startedAt)) / 60000) - Number(shift.totalBreakMinutes || 0));
    const totalHours = Number((totalMinutes / 60).toFixed(2));
    const assignment = assignments.find((item) => item.id === shift.assignmentId);
    const earlyExit = isEarlyShiftExit(assignment, endedAtIso);
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, endedAt: endedAtIso, totalWorkMinutes: totalMinutes, status: 'finished', earlyExit, endLocation: meta.position || null, endDevice: meta.device || null } : item)));
    setAssignments((current) => current.map((item) => (item.id === shift.assignmentId ? { ...item, status: 'completed', completedAt: endedAtIso, earlyExit } : item)));
    setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Mesai Bitti', workedToday: totalHours } : courier)));
    const earning = {
      id: `ern-${crypto.randomUUID().slice(0, 8)}`,
      courierId: shift.courierId,
      shiftId,
      hourlyRate: 225,
      totalHours,
      totalAmount: calculateEarnings(totalHours),
      approvalStatus: 'pending',
    };
    setEarnings((current) => [earning, ...current]);
    addShiftEvent({ type: 'shift_finished', courierId: shift.courierId, shiftId, assignmentId: shift.assignmentId, restaurantId: shift.restaurantId, createdAt: endedAtIso, dedupeKey: `shift_finished:${shiftId}`, ...meta });
    if (earlyExit) {
      addShiftEvent({ type: 'early_exit', courierId: shift.courierId, shiftId, assignmentId: shift.assignmentId, restaurantId: shift.restaurantId, createdAt: endedAtIso, dedupeKey: `early_exit:${shiftId}`, ...meta });
    }
    addAuditLog('shift_finished', { courierId: shift.courierId, shiftId, totalMinutes, earlyExit, ...meta });
    return earning;
  }, [addAuditLog, addShiftEvent, assignments, enqueuePendingOfflineAction, shifts]);

  const approveShift = useCallback((shiftId) => {
    const approvedAt = new Date().toISOString();
    setShifts((current) => current.map((shift) => (shift.id === shiftId ? { ...shift, approvalStatus: 'approved', approvedByAdmin: true, approvedAt } : shift)));
    addAuditLog('shift_approved', { shiftId });
  }, [addAuditLog]);

  const rejectShift = useCallback((shiftId, reason = 'Admin reddetti') => {
    const shift = shifts.find((item) => item.id === shiftId);
    const rejectedAt = new Date().toISOString();
    setShifts((current) => current.map((item) => (item.id === shiftId ? { ...item, status: 'rejected', approvalStatus: 'rejected', approvedByAdmin: false, rejectedAt, rejectionReason: reason } : item)));
    if (shift?.assignmentId) {
      setAssignments((current) => current.map((item) => (item.id === shift.assignmentId ? { ...item, status: 'planned', approvalStatus: 'rejected', rejectionReason: reason } : item)));
    }
    if (shift?.courierId) {
      setCouriers((current) => current.map((courier) => (courier.id === shift.courierId ? { ...courier, status: 'Mesai Bitti' } : courier)));
      addShiftEvent({ type: 'shift_rejected', courierId: shift.courierId, shiftId, assignmentId: shift.assignmentId, restaurantId: shift.restaurantId, createdAt: rejectedAt, dedupeKey: `shift_rejected:${shiftId}` });
    }
    addAuditLog('shift_rejected', { shiftId, reason });
  }, [addAuditLog, addShiftEvent, shifts]);

  useEffect(() => {
    if (!navigator.onLine || !pendingOfflineActions.some((item) => item.status === 'pending')) return undefined;

    const syncPendingActions = () => {
      if (!navigator.onLine) return;
      const pending = pendingOfflineActions.filter((item) => item.status === 'pending').sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      pending.forEach((action) => {
        try {
          if (action.type === 'shift_start') {
            startTrackedShift(action);
          } else if (action.type === 'break_start') {
            startTrackedBreak(action.shiftId, action);
          } else if (action.type === 'break_end') {
            endTrackedBreak(action.shiftId, action);
          } else if (action.type === 'shift_end') {
            endTrackedShift(action.shiftId, action);
          }
          setPendingOfflineActions((current) => current.map((item) => (item.id === action.id ? { ...item, status: 'synced', syncedAt: new Date().toISOString() } : item)));
        } catch (error) {
          setPendingOfflineActions((current) => current.map((item) => (item.id === action.id ? { ...item, status: 'failed', error: error.message } : item)));
        }
      });
    };

    syncPendingActions();
    window.addEventListener('online', syncPendingActions);
    return () => window.removeEventListener('online', syncPendingActions);
  }, [endTrackedBreak, endTrackedShift, pendingOfflineActions, setPendingOfflineActions, startTrackedBreak, startTrackedShift]);

  const ensureShiftWarningNotifications = useCallback((courierId = null) => {
    const created = [];
    assignments.forEach((assignment) => {
      if (courierId && assignment.courierId !== courierId) return;
      if (assignment.status === 'cancelled' || assignment.status === 'completed') return;

      const timing = getAssignmentTimingStatus(assignment, shifts);
      const type = timing.status === 'late'
        ? NOTIFICATION_TYPES.shiftLate
        : timing.status === 'no_show'
          ? NOTIFICATION_TYPES.shiftNoShow
          : null;
      if (!type) return;

      const alreadyExists = notifications.some((notification) =>
        notification.userId === assignment.courierId
        && notification.type === type
        && notification.entityId === assignment.id,
      );
      if (alreadyExists) return;

      created.push(shiftWarningNotification({
        assignment,
        restaurant: restaurants.find((restaurant) => restaurant.id === assignment.restaurantId),
        type,
      }));
      const courier = couriers.find((item) => item.id === assignment.courierId);
      created.push({
        userId: ADMIN_NOTIFICATION_USER_ID,
        type,
        title: type === NOTIFICATION_TYPES.shiftNoShow ? 'Kurye vardiya saatinde giriş yapmadı' : 'Kurye vardiyaya geç kaldı',
        message: `${courier?.fullName || 'Kurye'} ${assignment.startTime} vardiyasına başlamadı.`,
        actorRole: 'system',
        entityType: 'assignments',
        entityId: assignment.id,
        metadata: { assignmentId: assignment.id, courierId: assignment.courierId, startTime: assignment.startTime },
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        dedupeKey: `admin:${type}:${assignment.id}`,
      });
    });

    if (created.length) pushNotifications(created);
    return created;
  }, [assignments, couriers, notifications, pushNotifications, restaurants, shifts]);

  const value = useMemo(
    () => {
      const operationalAssignments = assignments.map((assignment) => ({
        ...assignment,
        operationalStatus: getAssignmentTimingStatus(assignment, shifts).status,
      }));
      return {
      couriers,
      admins,
      auditLogs,
      restaurants,
      assignments: operationalAssignments,
      rawAssignments: assignments,
      announcements,
      notifications,
      shifts,
      shiftEvents,
      breaks,
      earnings,
      pendingOfflineActions,
      settings,
      addCourier,
      addAdmin,
      toggleAdminActive,
      addAuditLog,
      updateCourier,
      toggleCourierActive,
      addRestaurant,
      updateRestaurant,
      addAssignment,
      updateAssignment,
      cancelAssignment,
      addBulkAssignments,
      addAnnouncement,
      markAnnouncementRead,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      ensureShiftWarningNotifications,
      startLocalShift: startTrackedShift,
      startLocalBreak: startTrackedBreak,
      endLocalBreak: endTrackedBreak,
      endLocalShift: endTrackedShift,
      approveShift,
      rejectShift,
      approveEarning,
      rejectEarning,
      updateSettings,
    };
    },
    [admins, auditLogs, couriers, restaurants, assignments, announcements, notifications, shifts, shiftEvents, breaks, earnings, pendingOfflineActions, settings, addCourier, addAdmin, toggleAdminActive, addAuditLog, updateCourier, toggleCourierActive, addRestaurant, updateRestaurant, addAssignment, updateAssignment, cancelAssignment, addBulkAssignments, addAnnouncement, markAnnouncementRead, pushNotification, markNotificationRead, markAllNotificationsRead, ensureShiftWarningNotifications, startTrackedShift, startTrackedBreak, endTrackedBreak, endTrackedShift, approveShift, rejectShift, approveEarning, rejectEarning, updateSettings],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error('useOperations must be used inside OperationsProvider');
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { announcements as initialAnnouncements } from '../data/announcements';
import { couriers as initialCouriers } from '../data/couriers';
import { restaurants as initialRestaurants } from '../data/restaurants';
import { todayISO } from '../utils/dateTime';
import { calculateEarnings } from '../services/earningsService';
import { getAssignmentTimingStatus } from '../services/timeService';
import { updateLocalUser, upsertLocalUser } from '../services/localUserStore';
import {
  NOTIFICATION_TYPES,
  announcementNotification,
  assignmentNotification,
  shiftWarningNotification,
} from '../services/notificationService';

const OperationsContext = createContext(null);
const STORAGE_PREFIX = 'dexa.operations.';

function readStoredState(key, fallback) {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readStoredState(key, initialValue));

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch {
      // The in-memory flow still works if browser storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue];
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
    setNotifications((current) => [notification, ...current]);
    return notification;
  }, []);

  const pushNotifications = useCallback((items) => {
    const created = items.map((payload) => ({
      id: `ntf-${crypto.randomUUID().slice(0, 8)}`,
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    }));
    setNotifications((current) => [...created, ...current]);
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

  const addCourier = useCallback((payload) => {
    const courier = {
      id: `cr-${crypto.randomUUID().slice(0, 8)}`,
      fullName: payload.fullName,
      username: payload.username,
      phone: payload.phone,
      password: payload.password,
      active: true,
      status: payload.currentStatus || 'Mesai Bitti',
      currentStatus: payload.currentStatus || 'Mesai Bitti',
      restaurantId: payload.restaurantId || restaurants[0]?.id,
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
      email: `${courier.username}@dexa.local`,
      courierId: courier.id,
      active: courier.active,
    });
    addAuditLog('courier_created', { courierId: courier.id, fullName: courier.fullName });
    return courier;
  }, [addAuditLog, restaurants]);

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
        email: `${payload.username}@dexa.local`,
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
    });

    if (created.length) pushNotifications(created);
    return created;
  }, [assignments, notifications, pushNotifications, restaurants, shifts]);

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
      breaks,
      earnings,
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
      startLocalShift,
      startLocalBreak,
      endLocalBreak,
      endLocalShift,
      approveEarning,
      rejectEarning,
    };
    },
    [admins, auditLogs, couriers, restaurants, assignments, announcements, notifications, shifts, breaks, earnings, addCourier, addAdmin, toggleAdminActive, addAuditLog, updateCourier, toggleCourierActive, addRestaurant, updateRestaurant, addAssignment, updateAssignment, cancelAssignment, addBulkAssignments, addAnnouncement, markAnnouncementRead, pushNotification, markNotificationRead, markAllNotificationsRead, ensureShiftWarningNotifications, startLocalShift, startLocalBreak, endLocalBreak, endLocalShift, approveEarning, rejectEarning],
  );

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error('useOperations must be used inside OperationsProvider');
  return context;
}

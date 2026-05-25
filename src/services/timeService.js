import { todayISO, shiftWindowMinutes } from '../utils/dateTime';

export const SHIFT_STATUS = {
  planned: 'planned',
  upcoming: 'upcoming',
  active: 'active',
  onBreak: 'on_break',
  completed: 'completed',
  late: 'late',
  noShow: 'no_show',
  pendingApproval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
};

export const LATE_TOLERANCE_MINUTES = 10;
export const NO_SHOW_TOLERANCE_MINUTES = 30;

export function currentMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export function assignmentStartMinutes(assignment) {
  return shiftWindowMinutes(assignment.startTime, assignment.endTime).start;
}

export function isAssignmentToday(assignment, date = todayISO()) {
  return assignment?.date === date;
}

export function getAssignmentTimingStatus(assignment, shifts = [], date = new Date()) {
  if (!assignment) return { status: SHIFT_STATUS.planned, minutesLate: 0 };
  if (assignment.date > todayISO()) return { status: SHIFT_STATUS.upcoming, minutesLate: 0 };
  if (assignment.date < todayISO()) return { status: SHIFT_STATUS.completed, minutesLate: 0 };

  const relatedShift = shifts.find((shift) => shift.assignmentId === assignment.id);
  if (relatedShift?.status === 'finished') return { status: SHIFT_STATUS.completed, minutesLate: 0 };
  if (relatedShift?.status === 'break') return { status: SHIFT_STATUS.onBreak, minutesLate: 0 };
  if (relatedShift?.status === 'working') return { status: SHIFT_STATUS.active, minutesLate: 0 };

  const minutesLate = currentMinutes(date) - assignmentStartMinutes(assignment);
  if (minutesLate >= NO_SHOW_TOLERANCE_MINUTES) return { status: SHIFT_STATUS.noShow, minutesLate };
  if (minutesLate >= LATE_TOLERANCE_MINUTES) return { status: SHIFT_STATUS.late, minutesLate };
  return { status: SHIFT_STATUS.planned, minutesLate: Math.max(0, minutesLate) };
}

export function isDayComplete(date) {
  return date < todayISO();
}

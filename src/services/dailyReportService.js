import { isDayComplete } from './timeService';

export function createDailyOperationReport({ date, couriers, restaurants, assignments, shifts, breaks, earnings }) {
  const dayAssignments = assignments.filter((assignment) => assignment.date === date);
  const dayAssignmentIds = new Set(dayAssignments.map((assignment) => assignment.id));
  const dayShifts = shifts.filter((shift) => dayAssignmentIds.has(shift.assignmentId));
  const dayShiftIds = new Set(dayShifts.map((shift) => shift.id));
  const dayBreaks = breaks.filter((item) => dayShiftIds.has(item.shiftId));
  const dayEarnings = earnings.filter((earning) => dayShiftIds.has(earning.shiftId));

  const restaurantSummary = restaurants.map((restaurant) => {
    const planned = dayAssignments.filter((assignment) => assignment.restaurantId === restaurant.id);
    const worked = dayShifts.filter((shift) => shift.restaurantId === restaurant.id);
    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      plannedCount: planned.length,
      startedCount: worked.length,
      completedCount: worked.filter((shift) => shift.status === 'finished').length,
      totalHours: worked.reduce((sum, shift) => sum + Number(shift.totalWorkMinutes || 0) / 60, 0),
    };
  }).filter((item) => item.plannedCount || item.startedCount);

  const courierSummary = couriers.map((courier) => {
    const planned = dayAssignments.filter((assignment) => assignment.courierId === courier.id);
    const worked = dayShifts.filter((shift) => shift.courierId === courier.id);
    return {
      courierId: courier.id,
      courierName: courier.fullName,
      plannedCount: planned.length,
      startedCount: worked.length,
      completedCount: worked.filter((shift) => shift.status === 'finished').length,
      totalHours: worked.reduce((sum, shift) => sum + Number(shift.totalWorkMinutes || 0) / 60, 0),
    };
  }).filter((item) => item.plannedCount || item.startedCount);

  return {
    date,
    status: isDayComplete(date) ? 'completed' : 'draft',
    plannedShiftCount: dayAssignments.length,
    startedCourierCount: new Set(dayShifts.map((shift) => shift.courierId)).size,
    finishedCourierCount: new Set(dayShifts.filter((shift) => shift.status === 'finished').map((shift) => shift.courierId)).size,
    lateCourierCount: dayAssignments.filter((assignment) => assignment.operationalStatus === 'late' || assignment.status === 'late').length,
    noShowCourierCount: dayAssignments.filter((assignment) => assignment.operationalStatus === 'no_show' || assignment.status === 'no_show').length,
    totalWorkHours: dayShifts.reduce((sum, shift) => sum + Number(shift.totalWorkMinutes || 0) / 60, 0),
    totalBreakMinutes: dayBreaks.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0),
    totalEarnings: dayEarnings.reduce((sum, earning) => sum + Number(earning.totalAmount || 0), 0),
    pendingEarnings: dayEarnings.filter((earning) => earning.approvalStatus === 'pending').reduce((sum, earning) => sum + Number(earning.totalAmount || 0), 0),
    approvedEarnings: dayEarnings.filter((earning) => earning.approvalStatus === 'approved').reduce((sum, earning) => sum + Number(earning.totalAmount || 0), 0),
    restaurantSummary,
    courierSummary,
  };
}

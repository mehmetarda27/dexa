export function toISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayISO() {
  return toISODate(new Date());
}

export function tomorrowISO() {
  return toISODate(addDays(new Date(), 1));
}

export function isToday(date) {
  return date === todayISO();
}

export function isFuture(date) {
  return date > todayISO();
}

export function isPast(date) {
  return date < todayISO();
}

export function minutesFromTime(time) {
  const [hour, minute] = String(time).split(':').map(Number);
  return hour * 60 + minute;
}

export function shiftWindowMinutes(startTime, endTime) {
  const start = minutesFromTime(startTime);
  let end = minutesFromTime(endTime);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function windowsOverlap(first, second) {
  return first.start < second.end && second.start < first.end;
}

export function calculateWorkedMinutes(startedAt, endedAt, totalBreakMinutes = 0) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000) - Number(totalBreakMinutes || 0));
}

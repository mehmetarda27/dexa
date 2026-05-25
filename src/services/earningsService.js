import { appEnv } from '../config/env';

export const HOURLY_RATE = appEnv.hourlyRate;

export function calculateEarnings(hours) {
  return hours * HOURLY_RATE;
}

export function getCourierEarnings(courier) {
  return {
    daily: calculateEarnings(courier.workedToday),
    weekly: calculateEarnings(courier.weeklyHours),
    monthly: calculateEarnings(courier.monthlyHours),
  };
}

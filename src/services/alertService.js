import { getAssignmentTimingStatus, SHIFT_STATUS } from './timeService';

export function buildCourierShiftAlert(assignment, shifts) {
  if (!assignment) {
    return { type: 'warning', title: 'Bugün vardiya yok', message: 'Bugün için atanmış vardiya bulunmuyor.' };
  }

  const timing = getAssignmentTimingStatus(assignment, shifts);
  if (timing.status === SHIFT_STATUS.noShow) {
    return {
      type: 'error',
      title: 'Mesai başlangıcı kaçırıldı',
      message: 'Mesai başlangıcını kaçırdın, admin ile iletişime geç.',
    };
  }
  if (timing.status === SHIFT_STATUS.late) {
    return {
      type: 'warning',
      title: 'Vardiya saatin geçti',
      message: 'Vardiya saatin geçti, mesai başlatman gerekiyor.',
    };
  }
  if (timing.status === SHIFT_STATUS.upcoming) {
    return { type: 'info', title: 'Yaklaşan vardiya', message: 'Bu vardiya sadece görüntülenebilir.' };
  }
  return { type: 'info', title: 'Vardiya hazır', message: 'Vardiya saatinde GPS doğrulamasıyla mesai başlatabilirsin.' };
}

export function getDisabledShiftReason({ hasAssignment, position, accuracyOk, inRange, openShift, action }) {
  if (!hasAssignment) return 'Bugün atanmış vardiya yok.';
  if (!position) return 'Önce Konumu Kontrol Et ile GPS konumu alınmalı.';
  if (!accuracyOk) return 'GPS doğruluğu 50 metreden iyi olmalı.';
  if (!inRange) return 'Restorana 100 metre içinde olmalısın.';
  if (action === 'start' && openShift) return 'Mesai zaten açık.';
  if (action === 'finish' && !openShift) return 'Açık mesai bulunmuyor.';
  return '';
}

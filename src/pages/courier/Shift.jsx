import { Crosshair, LocateFixed, MapPinned, RefreshCw, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import DistanceCard from '../../components/courier/DistanceCard';
import ShiftControls from '../../components/courier/ShiftControls';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import { getSession } from '../../services/authService';
import {
  calculateDistanceToRestaurant,
  getCurrentPosition,
  MAX_ALLOWED_ACCURACY_METERS,
} from '../../services/locationService';
import { buildCourierShiftAlert, getDisabledShiftReason } from '../../services/alertService';
import { useOperations } from '../../state/OperationsContext';
import { todayISO, tomorrowISO } from '../../utils/dateTime';

export default function Shift() {
  const { notify } = useToast();
  const {
    couriers,
    restaurants,
    assignments,
    shifts,
    breaks,
    pendingOfflineActions,
    startLocalShift,
    startLocalBreak,
    endLocalBreak,
    endLocalShift,
  } = useOperations();
  const session = getSession();
  const courier = couriers.find((item) => item.id === session?.courierId);
  if (!courier) {
    return <EmptyState title="Kurye kaydı bulunamadı" description="Bu kullanıcı için aktif kurye profili oluşturulduğunda vardiya işlemleri burada açılır." />;
  }
  const todayAssignment = assignments.find((item) => item.courierId === courier.id && item.date === todayISO());
  const tomorrowAssignment = assignments.find((item) => item.courierId === courier.id && item.date === tomorrowISO());
  const restaurant = restaurants.find((item) => item.id === todayAssignment?.restaurantId) || restaurants.find((item) => item.id === courier.restaurantId);
  const openShift = shifts.find((item) => item.courierId === courier.id && ['working', 'break'].includes(item.status));
  const activeBreak = openShift ? breaks.find((item) => item.shiftId === openShift.id && item.status === 'active') : null;
  const pendingActions = pendingOfflineActions.filter((item) => item.courierId === courier.id && item.status === 'pending');

  const [position, setPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('İzin bekleniyor');
  const [gpsError, setGpsError] = useState('');
  const [busy, setBusy] = useState(false);

  const distanceState = useMemo(() => {
    const distance = position && restaurant ? calculateDistanceToRestaurant(position, restaurant) : Number.POSITIVE_INFINITY;
    const accuracyOk = position ? Number(position.accuracy || 0) <= MAX_ALLOWED_ACCURACY_METERS : false;
    return {
      restaurant,
      distance,
      inRange: Boolean(position && restaurant && accuracyOk && distance <= Number(restaurant.radius || 100)),
      currentPosition: position,
      accuracyOk,
    };
  }, [position, restaurant]);

  const requestGps = async (successText = 'Konum doğrulandı.') => {
    setBusy(true);
    setGpsError('');
    try {
      const nextPosition = await getCurrentPosition();
      setPosition(nextPosition);
      if (nextPosition.mocked) {
        throw new Error('Sahte GPS veya mock location algılandı. İşlem güvenlik nedeniyle engellendi.');
      }
      setGpsStatus('İzin verildi');
      if (nextPosition.accuracy > MAX_ALLOWED_ACCURACY_METERS) {
        throw new Error(`GPS doğruluğu düşük: ${Math.round(nextPosition.accuracy)} m. İşlem için ${MAX_ALLOWED_ACCURACY_METERS} m veya daha iyi doğruluk gerekir.`);
      }
      notify({ title: 'Konum alındı', message: `${Math.round(nextPosition.accuracy)} m doğrulukla ${successText}` });
      return nextPosition;
    } catch (error) {
      setGpsStatus('İşlem yapılamaz');
      setGpsError(error.message);
      notify({ type: 'error', title: 'Konum hatası', message: error.message });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const runShiftAction = async (action, successMessage, needsFreshGps = false) => {
    setBusy(true);
    try {
      let actionPosition = position;
      if (needsFreshGps) {
        actionPosition = await requestGps('işlem konumu alındı.');
      } else if (!position) {
        throw new Error('Önce GPS izni verip konum alın.');
      }
      const actionDistance = calculateDistanceToRestaurant(actionPosition, restaurant);
      if (actionDistance > Number(restaurant.radius || 100)) {
        throw new Error('Restorana 100 metre içinde olmalısın.');
      }
      const result = await action(actionPosition);
      if (result?.status === 'pending') {
        notify({ title: 'İnternet yok', message: 'İşlem beklemeye alındı. Bağlantı gelince otomatik senkronlanacak.' });
        return;
      }
      notify({ title: 'İşlem tamamlandı', message: successMessage });
    } catch (error) {
      notify({ type: 'error', title: 'İşlem yapılamadı', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const hasTodayAssignment = Boolean(todayAssignment && todayAssignment.status !== 'cancelled');
  const canUseLocation = Boolean(position && distanceState.accuracyOk && distanceState.inRange);
  const canStart = hasTodayAssignment && todayAssignment.operationalStatus !== 'no_show' && canUseLocation && !openShift;
  const canBreak = canUseLocation && openShift?.status === 'working';
  const canReturn = openShift?.status === 'break';
  const canFinish = canUseLocation && Boolean(openShift) && openShift.status !== 'finished';
  const helperText = getDisabledShiftReason({
    hasAssignment: hasTodayAssignment,
    position,
    accuracyOk: distanceState.accuracyOk,
    inRange: distanceState.inRange,
    openShift,
    action: openShift ? 'finish' : 'start',
  }) || 'Konum doğrulandı. Vardiya işlemleri kullanılabilir.';
  const shiftAlert = buildCourierShiftAlert(todayAssignment, shifts);

  return (
    <div className="grid gap-5">
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="eyebrow">Bugünkü vardiya</span>
            <h1 className="mt-2 text-3xl font-black text-white">{restaurant?.name || 'Bugün vardiya yok'}</h1>
            <p className="mt-2 text-sm text-dexa-muted">
              {todayAssignment ? `${todayAssignment.startTime} - ${todayAssignment.endTime}` : 'Mesai işlemi yapılamaz'}
            </p>
            {tomorrowAssignment && (
              <p className="mt-2 text-sm text-dexa-muted">
                Yarın: {restaurants.find((item) => item.id === tomorrowAssignment.restaurantId)?.name} · {tomorrowAssignment.startTime} - {tomorrowAssignment.endTime}
              </p>
            )}
          </div>
          <StatusBadge>{todayAssignment?.status === 'cancelled' ? 'Reddedildi' : openShift?.status === 'break' ? 'Molada' : openShift ? 'Çalışıyor' : 'Mesai Bitti'}</StatusBadge>
        </div>
        {openShift?.approvalStatus && (
          <p className="mt-3 text-sm text-dexa-muted">
            Admin onayı: {openShift.approvalStatus === 'approved' ? 'Onaylandı' : openShift.approvalStatus === 'rejected' ? 'Reddedildi' : 'Onay bekliyor'}
          </p>
        )}
        {todayAssignment?.status === 'cancelled' && (
          <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            Bugünkü vardiya iptal edildi. Mesai işlemi yapılamaz.
          </div>
        )}
        {pendingActions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
            İnternet yok işlem beklemede. {pendingActions.length} işlem bağlantı gelince Firebase ile senkronlanacak.
          </div>
        )}
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${shiftAlert.type === 'error' ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : shiftAlert.type === 'warning' ? 'border-amber-300/20 bg-amber-300/10 text-amber-100' : 'border-dexa-cyan/20 bg-dexa-cyan/10 text-dexa-cyan'}`}>
          <strong>{shiftAlert.title}</strong>
          <p className="mt-1">{shiftAlert.message}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <DistanceCard distanceState={distanceState} position={position} />
        <div className="grid gap-5">
          <section className="glass-panel rounded-[2rem] p-5">
            <ShieldCheck className="text-dexa-cyan" />
            <h2 className="mt-3 text-xl font-bold text-white">GPS izin durumu</h2>
            <p className="mt-2 text-sm leading-6 text-dexa-muted">
              Mesai başlatma ve bitirme işlemleri gerçek tarayıcı konumu ile restoran koordinatı karşılaştırılarak yapılır.
            </p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="flex items-center gap-2 text-sm text-dexa-muted"><Crosshair size={15} />İzin</span>
                <strong className="text-white">{gpsStatus}</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="flex items-center gap-2 text-sm text-dexa-muted"><MapPinned size={15} />Doğruluk</span>
                <strong className="text-white">{position ? `${Math.round(position.accuracy)} m` : 'Bekleniyor'}</strong>
              </div>
            </div>
            {gpsError && <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{gpsError}</p>}
            {!distanceState.inRange && position && <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Restorana 100 metre içinde olmalısın.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button className="primary-button" type="button" onClick={() => requestGps('izin ve konum alındı.')} disabled={busy}>
                <LocateFixed size={18} />
                GPS izni ver
              </button>
              <button className="secondary-button" type="button" onClick={() => requestGps('konum kontrol edildi.')} disabled={busy}>
                <MapPinned size={18} />
                Konumu Kontrol Et
              </button>
              <button className="secondary-button sm:col-span-2" type="button" onClick={() => requestGps('konum yenilendi.')} disabled={busy}>
                <RefreshCw size={18} />
                Konumu yenile
              </button>
            </div>
          </section>

          <ShiftControls
            canStart={canStart}
            canBreak={canBreak}
            canReturn={canReturn}
            canFinish={canFinish}
            busy={busy}
            helperText={helperText}
            onStart={() => runShiftAction((actionPosition) => startLocalShift({ courierId: courier.id, restaurantId: restaurant.id, assignmentId: todayAssignment.id, position: actionPosition, device: window.DexaAndroid?.deviceSummary?.() || navigator.userAgent }), 'Mesai sistem saatiyle başlatıldı.', true)}
            onBreak={() => runShiftAction((actionPosition) => startLocalBreak(openShift.id, { position: actionPosition, device: window.DexaAndroid?.deviceSummary?.() || navigator.userAgent }), 'Mola başlatıldı.')}
            onReturn={() => runShiftAction((actionPosition) => endLocalBreak(openShift.id, { position: actionPosition, device: window.DexaAndroid?.deviceSummary?.() || navigator.userAgent }), 'Mola tamamlandı.')}
            onFinish={() => runShiftAction((actionPosition) => endLocalShift(openShift.id, { position: actionPosition, device: window.DexaAndroid?.deviceSummary?.() || navigator.userAgent }), 'Mesai sistem saatiyle bitirildi. Kazanç onay bekliyor.', true)}
          />
        </div>
      </div>
    </div>
  );
}

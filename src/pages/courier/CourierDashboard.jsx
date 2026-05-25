import { Bell, Clock3, MapPin, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import DistanceCard from '../../components/courier/DistanceCard';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { getSession } from '../../services/authService';
import { getCourierEarnings } from '../../services/earningsService';
import { getCourierDistanceState } from '../../services/locationService';
import { useOperations } from '../../state/OperationsContext';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';

export default function CourierDashboard() {
  const { announcements, couriers, notifications } = useOperations();
  const session = getSession();
  const courier = couriers.find((item) => item.id === session.courierId);

  if (!courier) {
    return <EmptyState title="Kurye kaydı bulunamadı" description="Bu kullanıcı için aktif kurye profili oluşturulduğunda dashboard bilgileri burada görünür." />;
  }

  const distanceState = getCourierDistanceState(courier);
  const earnings = getCourierEarnings(courier);
  const visibleAnnouncements = announcements.filter((item) => item.target === 'all' || item.target === courier.id);
  const unreadNotifications = notifications.filter((item) => item.userId === courier.id && !item.read).length;

  return (
    <div className="grid gap-5">
      <div className="kpi-grid">
        <StatCard icon={Clock3} label="Bugünkü vardiya" value={courier.shift} detail={courier.status} />
        <StatCard icon={MapPin} label="Restoran mesafesi" value={`${distanceState.distance} m`} detail={distanceState.restaurant.name} tone="green" />
        <StatCard icon={Wallet} label="Günlük kazanç" value={formatCurrency(earnings.daily)} detail={formatHours(courier.workedToday)} tone="amber" />
        <StatCard icon={Bell} label="Bildirim" value={unreadNotifications} detail={`${visibleAnnouncements.length} duyuru görünebilir`} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <DistanceCard distanceState={distanceState} position={distanceState.currentPosition} />
        <section className="glass-panel rounded-[2rem] p-5">
          <span className="eyebrow">Mesai kontrolu</span>
          <h2 className="mt-2 text-2xl font-black text-white">Vardiya islemleri</h2>
          <p className="mt-4 text-sm leading-6 text-dexa-muted">
            Mesai baslatma, mola ve mesai bitirme islemleri GPS dogrulamasiyla Vardiya ekraninda yapilir.
          </p>
          <NavLink className="primary-button mt-6 w-full" to="/courier/shift">
            Vardiya ekranina git
          </NavLink>
        </section>
      </div>

      <section className="glass-panel rounded-[2rem] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Calisma ozeti</h2>
          <StatusBadge>{courier.status}</StatusBadge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-sm text-dexa-muted">Baslangic</span>
            <strong className="mt-1 block text-white">{courier.startTime || 'Bekliyor'}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-sm text-dexa-muted">Bitis</span>
            <strong className="mt-1 block text-white">{courier.endTime || 'Devam ediyor'}</strong>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="text-sm text-dexa-muted">Sure</span>
            <strong className="mt-1 block text-white">{formatHours(courier.workedToday)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

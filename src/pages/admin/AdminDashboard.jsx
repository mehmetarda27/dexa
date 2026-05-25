import { AlertTriangle, Bell, Building2, CheckCircle2, Clock3, History, Settings2, UserX, UsersRound, Wallet } from 'lucide-react';
import ApprovalPanel from '../../components/admin/ApprovalPanel';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { useOperations } from '../../state/OperationsContext';
import { calculateEarnings } from '../../services/earningsService';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';

export default function AdminDashboard() {
  const { couriers, restaurants, assignments, shifts, shiftEvents, notifications, earnings, settings, updateSettings } = useOperations();
  const activeCouriers = couriers.filter((courier) => courier.active).length;
  const pending = earnings.filter((earning) => earning.approvalStatus === 'pending').length;
  const totalHours = earnings.reduce((sum, earning) => sum + Number(earning.totalHours || 0), 0);
  const totalEarnings = calculateEarnings(totalHours);
  const lateAssignments = assignments.filter((assignment) => assignment.operationalStatus === 'late');
  const noShowAssignments = assignments.filter((assignment) => assignment.operationalStatus === 'no_show');
  const activeShifts = shifts.filter((shift) => ['working', 'break'].includes(shift.status));
  const latestEvents = [...shiftEvents].slice(0, 8);
  const adminNotifications = notifications.filter((notification) => notification.userId === 'admin').slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Admin dashboard"
        title="Operasyon kontrol paneli"
        description="Kuryeler, restoran atamaları, vardiya saatleri ve kazanç onayları tek yönetim ekranında izlenir."
      />
      <div className="kpi-grid">
        <StatCard icon={UsersRound} label="Aktif kurye" value={activeCouriers} detail={`${couriers.length} toplam kayıt`} />
        <StatCard icon={Building2} label="Restoran" value={restaurants.length} detail="100 m menzil tanımlı" tone="green" />
        <StatCard icon={AlertTriangle} label="Geç kalan kuryeler" value={lateAssignments.length} detail="10 dk tolerans sonrası" tone="amber" />
        <StatCard icon={UserX} label="Mesaiye gelmeyenler" value={noShowAssignments.length} detail="30 dk tolerans sonrası" tone="rose" />
      </div>
      <div className="kpi-grid mt-4">
        <StatCard icon={Clock3} label="Haftalık saat" value={formatHours(totalHours)} detail="Aktif veri oluşunca güncellenir" tone="amber" />
        <StatCard icon={Wallet} label="Haftalık kazanç" value={formatCurrency(totalEarnings)} detail={`${pending} kayıt onay bekliyor`} tone="rose" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="eyebrow">Saha durumu</span>
              <h2 className="mt-2 text-xl font-bold text-white">Kurye ve restoran atamaları</h2>
            </div>
            <CheckCircle2 className="text-dexa-cyan" />
          </div>
          {assignments.length ? (
            <div className="grid gap-3">
              {assignments.map((assignment) => {
                const courier = couriers.find((item) => item.id === assignment.courierId);
                const restaurant = restaurants.find((item) => item.id === assignment.restaurantId);
                return (
                  <article key={assignment.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <strong className="text-white">{courier?.fullName}</strong>
                      <p className="mt-1 text-sm text-dexa-muted">{restaurant?.name} · {assignment.startTime} - {assignment.endTime}</p>
                    </div>
                    <StatusBadge>{assignment.operationalStatus === 'late' ? 'Geç Kaldı' : assignment.operationalStatus === 'no_show' ? 'Gelmedi' : assignment.operationalStatus === 'active' ? 'Aktif' : 'Onay Bekliyor'}</StatusBadge>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Henüz vardiya planlanmadı" description="Kurye ekleyip restoran ataması yaptığınızda operasyon akışı burada görünür." />
          )}
        </section>
        <ApprovalPanel />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Canlı vardiya</span>
              <h2 className="mt-2 text-xl font-bold text-white">Anlık kurye mesai takibi</h2>
            </div>
            <History className="text-dexa-cyan" />
          </div>
          <div className="grid gap-3">
            {activeShifts.length ? activeShifts.map((shift) => {
              const courier = couriers.find((item) => item.id === shift.courierId);
              return (
                <article key={shift.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <strong className="text-white">{courier?.fullName}</strong>
                    <p className="mt-1 text-sm text-dexa-muted">
                      Mesai başladı · {new Date(shift.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <StatusBadge>{shift.status === 'break' ? 'Molada' : shift.approvalStatus === 'pending' ? 'Onay Bekliyor' : 'Çalışıyor'}</StatusBadge>
                </article>
              );
            }) : <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-dexa-muted">Aktif vardiya yok.</p>}
          </div>
          <div className="mt-5 grid gap-3">
            {latestEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-[#0b1326] p-3 text-sm text-dexa-muted">
                <span className="font-semibold text-white">{event.message}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <span className="eyebrow">Bildirim geçmişi</span>
              <h2 className="mt-2 text-xl font-bold text-white">Admin uyarıları</h2>
            </div>
            <Bell className="text-dexa-cyan" />
          </div>
          <label className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white">
            <span className="flex items-center gap-2"><Settings2 size={16} /> Admin onayı zorunlu</span>
            <input type="checkbox" checked={settings.adminApprovalRequired} onChange={(event) => updateSettings({ adminApprovalRequired: event.target.checked })} />
          </label>
          <div className="grid gap-3">
            {adminNotifications.length ? adminNotifications.map((notification) => (
              <article key={notification.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <strong className="text-sm text-white">{notification.title}</strong>
                <p className="mt-1 text-sm text-dexa-muted">{notification.message}</p>
              </article>
            )) : <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-dexa-muted">Henüz admin bildirimi yok.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-xl font-bold text-white">Geç kalan kuryeler</h2>
          <div className="mt-4 grid gap-3">
            {lateAssignments.length ? lateAssignments.map((assignment) => {
              const courier = couriers.find((item) => item.id === assignment.courierId);
              return <div key={assignment.id} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{courier?.fullName} · {assignment.startTime}</div>;
            }) : <p className="text-sm text-dexa-muted">Geç kalan kurye yok.</p>}
          </div>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-xl font-bold text-white">Mesaiye gelmeyenler</h2>
          <div className="mt-4 grid gap-3">
            {noShowAssignments.length ? noShowAssignments.map((assignment) => {
              const courier = couriers.find((item) => item.id === assignment.courierId);
              return <div key={assignment.id} className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{courier?.fullName} · {assignment.startTime}</div>;
            }) : <p className="text-sm text-dexa-muted">Mesaiye gelmeyen kurye yok.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

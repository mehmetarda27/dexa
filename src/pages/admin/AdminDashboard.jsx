import { AlertTriangle, Building2, CheckCircle2, Clock3, UserX, UsersRound, Wallet } from 'lucide-react';
import ApprovalPanel from '../../components/admin/ApprovalPanel';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { useOperations } from '../../state/OperationsContext';
import { calculateEarnings } from '../../services/earningsService';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';

export default function AdminDashboard() {
  const { couriers, restaurants, assignments, earnings } = useOperations();
  const activeCouriers = couriers.filter((courier) => courier.active).length;
  const pending = earnings.filter((earning) => earning.approvalStatus === 'pending').length;
  const totalHours = earnings.reduce((sum, earning) => sum + Number(earning.totalHours || 0), 0);
  const totalEarnings = calculateEarnings(totalHours);
  const lateAssignments = assignments.filter((assignment) => assignment.operationalStatus === 'late');
  const noShowAssignments = assignments.filter((assignment) => assignment.operationalStatus === 'no_show');

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

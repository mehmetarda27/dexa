import { CalendarDays, Clock3, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/ToastProvider';
import { getSession } from '../../services/authService';
import { calculateEarnings, HOURLY_RATE } from '../../services/earningsService';
import { useOperations } from '../../state/OperationsContext';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';

export default function Earnings() {
  const { couriers, earnings } = useOperations();
  const { notify } = useToast();
  const courier = couriers.find((item) => item.id === getSession()?.courierId);
  if (!courier) {
    return <EmptyState title="Kazanç kaydı bulunamadı" description="Kurye profili ve tamamlanan mesai oluştuğunda kazanç kayıtları burada listelenir." />;
  }
  const [hours, setHours] = useState(courier.plannedHours);
  const [status, setStatus] = useState('all');
  const ownEarnings = useMemo(() => earnings.filter((earning) => earning.courierId === courier.id && (status === 'all' || earning.approvalStatus === status)), [courier.id, earnings, status]);
  const approvedAmount = earnings.filter((earning) => earning.courierId === courier.id && earning.approvalStatus === 'approved').reduce((sum, earning) => sum + earning.totalAmount, 0);
  const pendingAmount = earnings.filter((earning) => earning.courierId === courier.id && earning.approvalStatus === 'pending').reduce((sum, earning) => sum + earning.totalAmount, 0);
  const monthlyAmount = earnings.filter((earning) => earning.courierId === courier.id).reduce((sum, earning) => sum + earning.totalAmount, 0);

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Wallet} label="Onay bekleyen" value={formatCurrency(pendingAmount)} detail="Admin onayı bekler" />
        <StatCard icon={Clock3} label="Onaylanan" value={formatCurrency(approvedAmount)} detail="Kesinleşen kazanç" tone="green" />
        <StatCard icon={CalendarDays} label="Aylık toplam" value={formatCurrency(monthlyAmount)} detail="Tüm kayıtlar" tone="amber" />
      </div>
      <section className="glass-panel rounded-[2rem] p-5">
        <span className="eyebrow">Kazanç hesaplama</span>
        <h1 className="mt-2 text-3xl font-black text-white">Çalışma saati x {formatCurrency(HOURLY_RATE)}</h1>
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_280px] md:items-center">
          <label className="grid gap-3 text-sm font-semibold text-dexa-ink">
            Günlük çalışma saati
            <input className="w-full accent-dexa-cyan" type="range" min="1" max="12" value={hours} onChange={(event) => setHours(Number(event.target.value))} />
          </label>
          <div className="rounded-3xl border border-dexa-cyan/20 bg-dexa-cyan/10 p-5">
            <span className="text-sm text-dexa-muted">{hours} saat</span>
            <strong className="mt-1 block text-3xl font-black text-white">{formatCurrency(calculateEarnings(hours))}</strong>
          </div>
        </div>
      </section>
      <section className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-white">Çalışma geçmişi</h2>
          <div className="flex gap-2">
            <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tüm kayıtlar</option>
              <option value="pending">Onay bekleyen</option>
              <option value="approved">Onaylanan</option>
              <option value="rejected">Reddedilen</option>
            </select>
            <button className="secondary-button" type="button" onClick={() => notify({ title: 'Kazanç filtrelendi', message: 'Seçili durum uygulandı.' })}>Filtrele</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {ownEarnings.map((earning) => (
            <article key={earning.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div>
                <strong className="text-white">{earning.approvalStatus === 'approved' ? 'Onaylanan kazanç' : earning.approvalStatus === 'rejected' ? 'Reddedilen kazanç' : 'Onay bekleyen kazanç'}</strong>
                <p className="mt-1 text-sm text-dexa-muted">{formatHours(earning.totalHours)}</p>
              </div>
              <strong className="text-white">{formatCurrency(earning.totalAmount)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

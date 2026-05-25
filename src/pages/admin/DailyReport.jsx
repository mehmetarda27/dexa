import { CalendarDays, CheckCircle2, Clock3, Wallet, AlertTriangle, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { createDailyOperationReport } from '../../services/dailyReportService';
import { useOperations } from '../../state/OperationsContext';
import { todayISO } from '../../utils/dateTime';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';

export default function DailyReport() {
  const operations = useOperations();
  const [date, setDate] = useState(todayISO());
  const report = useMemo(() => createDailyOperationReport({ date, ...operations }), [date, operations]);

  return (
    <div>
      <PageHeader
        eyebrow="Gün sonu raporu"
        title="Operasyon özeti"
        description="Günlük vardiya, mesai, mola, kazanç ve restoran bazlı operasyon raporu."
        action={<input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />}
      />

      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <StatusBadge>{report.status === 'completed' ? 'Onaylandı' : 'Onay Bekliyor'}</StatusBadge>
        <span className="text-sm text-dexa-muted">{report.status === 'completed' ? 'Rapor tamamlandı' : 'Gün bitmeden rapor taslak olarak görünür'}</span>
      </div>

      <div className="kpi-grid">
        <StatCard icon={CalendarDays} label="Planlanan vardiya" value={report.plannedShiftCount} detail={date} />
        <StatCard icon={CheckCircle2} label="Mesaiye başlayan" value={report.startedCourierCount} detail="Kurye sayısı" tone="green" />
        <StatCard icon={AlertTriangle} label="Geç kalan" value={report.lateCourierCount} detail="10 dk tolerans" tone="amber" />
        <StatCard icon={UserX} label="Gelmedi" value={report.noShowCourierCount} detail="30 dk tolerans" tone="rose" />
      </div>

      <div className="kpi-grid mt-4">
        <StatCard icon={Clock3} label="Toplam çalışma" value={formatHours(report.totalWorkHours)} detail={`${report.totalBreakMinutes} dk mola`} />
        <StatCard icon={Wallet} label="Toplam kazanç" value={formatCurrency(report.totalEarnings)} detail="Sistem hesabı" tone="green" />
        <StatCard icon={Wallet} label="Onay bekleyen" value={formatCurrency(report.pendingEarnings)} detail="Kesinleşmedi" tone="amber" />
        <StatCard icon={Wallet} label="Onaylanan" value={formatCurrency(report.approvedEarnings)} detail="Kesinleşen" tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-xl font-bold text-white">Restoran bazlı özet</h2>
          <div className="mt-4 grid gap-3">
            {report.restaurantSummary.length ? report.restaurantSummary.map((item) => (
              <article key={item.restaurantId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <strong className="text-white">{item.restaurantName}</strong>
                <p className="mt-1 text-sm text-dexa-muted">{item.plannedCount} plan · {item.completedCount} tamamlandı · {formatHours(item.totalHours)}</p>
              </article>
            )) : <EmptyState title="Restoran raporu yok" description="Seçili tarihte restoran bazlı çalışma kaydı bulunmuyor." />}
          </div>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h2 className="text-xl font-bold text-white">Kurye bazlı özet</h2>
          <div className="mt-4 grid gap-3">
            {report.courierSummary.length ? report.courierSummary.map((item) => (
              <article key={item.courierId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <strong className="text-white">{item.courierName}</strong>
                <p className="mt-1 text-sm text-dexa-muted">{item.plannedCount} plan · {item.completedCount} tamamlandı · {formatHours(item.totalHours)}</p>
              </article>
            )) : <EmptyState title="Kurye raporu yok" description="Seçili tarihte kurye bazlı çalışma kaydı bulunmuyor." />}
          </div>
        </section>
      </div>
    </div>
  );
}

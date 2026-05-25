import { CheckCircle2, XCircle } from 'lucide-react';
import { useOperations } from '../../state/OperationsContext';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';
import { useToast } from '../common/ToastProvider';
import StatusBadge from '../common/StatusBadge';

export default function ApprovalPanel() {
  const { couriers, shifts, earnings, approveEarning, rejectEarning, approveShift, rejectShift } = useOperations();
  const { notify } = useToast();
  const pending = earnings.filter((earning) => earning.approvalStatus === 'pending');
  const pendingShifts = shifts.filter((shift) => shift.approvalStatus === 'pending' && ['working', 'break'].includes(shift.status));

  return (
    <section className="glass-panel rounded-3xl p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Mesai onayı</span>
          <h2 className="mt-2 text-xl font-bold text-white">Onay bekleyen kayıtlar</h2>
        </div>
        <StatusBadge>Onay Bekliyor</StatusBadge>
      </div>
      <div className="grid gap-3">
        {pendingShifts.map((shift) => {
          const courier = couriers.find((item) => item.id === shift.courierId);
          return (
            <article key={shift.id} className="rounded-2xl border border-dexa-cyan/20 bg-dexa-cyan/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-white">{courier?.fullName}</strong>
                  <p className="mt-1 text-sm text-dexa-muted">
                    Mesai girişi · {new Date(shift.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { rejectShift(shift.id); notify({ title: 'Mesai girişi reddedildi', message: courier?.fullName }); }}>
                    <XCircle size={15} />
                    Reddet
                  </button>
                  <button className="primary-button min-h-9 px-3" type="button" onClick={() => { approveShift(shift.id); notify({ title: 'Mesai girişi onaylandı', message: courier?.fullName }); }}>
                    <CheckCircle2 size={15} />
                    Onayla
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {pending.map((earning) => {
          const courier = couriers.find((item) => item.id === earning.courierId);
          return (
            <article key={earning.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-white">{courier?.fullName}</strong>
                  <p className="mt-1 text-sm text-dexa-muted">
                    {formatHours(earning.totalHours)} · {formatCurrency(earning.totalAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { rejectEarning(earning.id); notify({ title: 'Mesai reddedildi', message: courier?.fullName }); }}>
                    <XCircle size={15} />
                    Reddet
                  </button>
                  <button className="primary-button min-h-9 px-3" type="button" onClick={() => { approveEarning(earning.id); notify({ title: 'Mesai onaylandı', message: courier?.fullName }); }}>
                    <CheckCircle2 size={15} />
                    Onayla
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!pending.length && !pendingShifts.length && <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-dexa-muted">Onay bekleyen mesai yok.</p>}
      </div>
    </section>
  );
}

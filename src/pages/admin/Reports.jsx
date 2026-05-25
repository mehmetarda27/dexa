import { BarChart3, CheckCircle2, Clock3, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import ApprovalPanel from '../../components/admin/ApprovalPanel';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import EmptyState from '../../components/common/EmptyState';
import { useOperations } from '../../state/OperationsContext';
import { formatCurrency, formatHours } from '../../utils/formatCurrency';
import { exportReportCsv, exportReportPdf } from '../../services/exportService';

function calculateReportAmount(rows, earnings) {
  return rows.reduce((sum, shift) => sum + Number(earnings.find((earning) => earning.shiftId === shift.id)?.totalAmount || 0), 0);
}

export default function Reports() {
  const { couriers, restaurants, assignments, shifts, earnings } = useOperations();
  const { notify } = useToast();
  const [filters, setFilters] = useState({ courierId: 'all', restaurantId: 'all', status: 'all', date: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const rows = useMemo(() => shifts.filter((shift) => shift.status === 'finished' || shift.status === 'rejected').filter((shift) => {
    const assignment = assignments.find((item) => item.id === shift.assignmentId);
    const status = shift.approvalStatus || earnings.find((earning) => earning.shiftId === shift.id)?.approvalStatus || 'pending';
    if (appliedFilters.courierId !== 'all' && shift.courierId !== appliedFilters.courierId) return false;
    if (appliedFilters.status !== 'all' && status !== appliedFilters.status) return false;
    if (appliedFilters.restaurantId !== 'all' && assignment?.restaurantId !== appliedFilters.restaurantId) return false;
    if (appliedFilters.date && assignment?.date !== appliedFilters.date) return false;
    return true;
  }), [appliedFilters, assignments, earnings, shifts]);

  const totalHours = rows.reduce((sum, row) => sum + Number((row.totalWorkMinutes || 0) / 60), 0);
  const totalAmount = calculateReportAmount(rows, earnings);
  const approved = rows.filter((row) => row.approvalStatus === 'approved').length;
  const pending = rows.filter((row) => (row.approvalStatus || 'pending') === 'pending').length;
  const exportRows = rows.map((shift) => {
    const courier = couriers.find((item) => item.id === shift.courierId);
    const assignment = assignments.find((item) => item.id === shift.assignmentId);
    const restaurant = restaurants.find((item) => item.id === assignment?.restaurantId);
    const earning = earnings.find((item) => item.shiftId === shift.id);
    return {
      courierName: courier?.fullName || '-',
      restaurantName: restaurant?.name || '-',
      date: assignment?.date || '-',
      startTime: shift.startedAt ? new Date(shift.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-',
      endTime: shift.endedAt ? new Date(shift.endedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-',
      totalHours: Number(((shift.totalWorkMinutes || 0) / 60).toFixed(2)),
      breakMinutes: shift.totalBreakMinutes || 0,
      totalAmount: earning?.totalAmount || 0,
      status: shift.earlyExit ? 'early_exit' : (shift.approvalStatus || earning?.approvalStatus || 'pending'),
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Rapor merkezi"
        title="Günlük, haftalık ve kazanç raporları"
        description="Kurye, restoran, tarih ve onay durumuna göre raporlar filtrelenir."
      />
      <div className="kpi-grid mb-6">
        <StatCard icon={Clock3} label="Toplam çalışma" value={formatHours(totalHours)} detail="Filtrelenen kayıtlar" />
        <StatCard icon={Wallet} label="Toplam kazanç" value={formatCurrency(totalAmount)} detail="225 TL saatlik ücret" tone="green" />
        <StatCard icon={CheckCircle2} label="Onaylanan" value={approved} detail="Kesinleşen kayıt" tone="amber" />
        <StatCard icon={BarChart3} label="Onay bekleyen" value={pending} detail="İnceleme gerekiyor" tone="rose" />
      </div>
      <div className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-5">
        <select className="field" value={filters.courierId} onChange={(event) => setFilters({ ...filters, courierId: event.target.value })}>
          <option value="all">Tüm kuryeler</option>
          {couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.fullName}</option>)}
        </select>
        <select className="field" value={filters.restaurantId} onChange={(event) => setFilters({ ...filters, restaurantId: event.target.value })}>
          <option value="all">Tüm restoranlar</option>
          {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
        </select>
        <select className="field" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="all">Tüm durumlar</option>
          <option value="pending">Onay bekleyen</option>
          <option value="approved">Onaylanan</option>
          <option value="rejected">Reddedilen</option>
        </select>
        <input className="field" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        <button className="primary-button" type="button" onClick={() => { setAppliedFilters(filters); notify({ title: 'Rapor filtrelendi', message: 'Seçili kriterler uygulandı.' }); }}>Rapor filtrele</button>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <button className="secondary-button" type="button" onClick={() => { exportReportCsv(exportRows); notify({ title: 'Excel raporu hazırlandı', message: 'CSV dosyası indirildi.' }); }}>Excel indir</button>
        <button className="secondary-button" type="button" onClick={() => { exportReportPdf(exportRows); notify({ title: 'PDF raporu hazırlandı', message: 'PDF dosyası indirildi.' }); }}>PDF indir</button>
      </div>
      <div className="two-column-grid">
        {rows.length ? <AdminTable columns={['Kurye', 'Saat', 'Mola', 'Durum']}>
          {rows.map((shift) => {
            const courier = couriers.find((item) => item.id === shift.courierId);
            const statusValue = shift.earlyExit ? 'early_exit' : (shift.approvalStatus || 'pending');
            const status = statusValue === 'approved' ? 'Onaylandı' : statusValue === 'rejected' ? 'Reddedildi' : statusValue === 'early_exit' ? 'Erken Çıkış' : 'Onay Bekliyor';
            return (
              <tr key={shift.id} className="border-b border-white/10 last:border-0">
                <td className="px-5 py-4 font-semibold text-white">{courier?.fullName}</td>
                <td className="px-5 py-4 text-sm text-white">{formatHours(Number((shift.totalWorkMinutes || 0) / 60))}</td>
                <td className="px-5 py-4 text-sm text-white">{shift.totalBreakMinutes || 0} dk</td>
                <td className="px-5 py-4"><StatusBadge>{status}</StatusBadge></td>
              </tr>
            );
          })}
        </AdminTable> : <EmptyState title="Henüz rapor kaydı yok" description="Mesai tamamlanıp kazanç kaydı oluştuğunda raporlar burada listelenir." />}
        <ApprovalPanel />
      </div>
    </div>
  );
}

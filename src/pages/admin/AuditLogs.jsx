import { useMemo, useState } from 'react';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { useOperations } from '../../state/OperationsContext';

export default function AuditLogs() {
  const { auditLogs } = useOperations();
  const [filters, setFilters] = useState({ user: '', action: '', date: '' });
  const rows = useMemo(() => auditLogs.filter((log) => {
    if (filters.user && !log.actorName.toLowerCase().includes(filters.user.toLowerCase())) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.date && !log.createdAt.startsWith(filters.date)) return false;
    return true;
  }), [auditLogs, filters]);
  const actions = Array.from(new Set(auditLogs.map((log) => log.action)));

  return (
    <div>
      <PageHeader eyebrow="İşlem geçmişi" title="Audit log" description="Kritik operasyon işlemleri silinmeden kayıt altında tutulur." />
      <div className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-3">
        <input className="field" placeholder="Kullanıcı" value={filters.user} onChange={(event) => setFilters({ ...filters, user: event.target.value })} />
        <select className="field" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}>
          <option value="">Tüm işlemler</option>
          {actions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
        <input className="field" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
      </div>
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((log) => (
            <article key={log.id} className="glass-panel rounded-2xl p-4">
              <strong className="text-white">{log.action}</strong>
              <p className="mt-1 text-sm text-dexa-muted">{log.actorName} · {new Date(log.createdAt).toLocaleString('tr-TR')}</p>
            </article>
          ))}
        </div>
      ) : <EmptyState title="İşlem kaydı yok" description="Kritik işlemler yapıldıkça audit log kayıtları burada görünür." />}
    </div>
  );
}
